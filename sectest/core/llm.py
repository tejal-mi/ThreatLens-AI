"""
LLM enrichment engine supporting Groq and OpenRouter OpenAI-compatible APIs.
"""

import json
import sys
from typing import Any
import httpx
from rich.console import Console
from sectest.config import get_llm_config
from sectest.core.schema import EnrichedFinding, RawFinding

if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(stderr=True, highlight=False)

SYSTEM_PROMPT = """You are an elite application security auditor. You analyze raw security findings discovered by automated scanner checks and enrich them with accurate severity ratings, root cause explanations, and actionable remediation steps.

OUTPUT REQUIREMENTS:
1. Return ONLY a valid JSON array of objects.
2. Do NOT wrap output in markdown fences (no ```json or ```).
3. Do NOT include any preamble, introduction, commentary, or postscript.
4. Each object in the array MUST correspond to one input finding and contain these exact fields:
   - "module": string (must match input)
   - "title": string (must match input)
   - "evidence": string (must match input)
   - "meta": object (must match input)
   - "severity": strictly one of ["critical", "high", "medium", "low", "info"]
   - "explanation": concise, professional explanation of why this is a risk and its realistic attack impact
   - "remediation": actionable, developer-friendly fix with code/config example where applicable
"""


def create_fallback_finding(raw: RawFinding, reason: str = "LLM enrichment unavailable — raw finding only") -> EnrichedFinding:
    """Create a default EnrichedFinding when LLM enrichment fails or is skipped."""
    return EnrichedFinding(
        module=raw.module,
        title=raw.title,
        evidence=raw.evidence,
        meta=raw.meta,
        severity="info",
        explanation=reason,
        remediation="Review target configuration manually.",
    )


async def call_chat_completion(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    timeout_seconds: float = 30.0,
) -> str:
    """Send an async chat completion request to an OpenAI-compatible endpoint."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        resp = await client.post(base_url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def clean_json_response(raw_text: str) -> str:
    """Defensively clean and extract JSON array from model output."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # If wrapped in brackets further down
    start_bracket = text.find("[")
    end_bracket = text.rfind("]")
    if start_bracket != -1 and end_bracket != -1 and end_bracket > start_bracket:
        text = text[start_bracket : end_bracket + 1]

    return text


async def enrich_batch(
    batch: list[RawFinding],
    base_url: str,
    api_key: str,
    model: str,
) -> list[EnrichedFinding]:
    """Enrich a single batch of up to 10 findings using LLM."""
    if not api_key:
        console.print("[yellow][!] Warning: No LLM API key provided. Using offline fallback findings.[/yellow]")
        return [create_fallback_finding(rf) for rf in batch]

    raw_data = [rf.model_dump() for rf in batch]
    user_prompt = f"Enrich these raw security findings:\n{json.dumps(raw_data, indent=2)}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        response_text = await call_chat_completion(base_url, api_key, model, messages)
        cleaned = clean_json_response(response_text)
        parsed_array = json.loads(cleaned)

        if not isinstance(parsed_array, list):
            raise ValueError("LLM response did not parse to a JSON array.")

        enriched_list: list[EnrichedFinding] = []
        for item in parsed_array:
            try:
                # Ensure severity is valid
                sev = str(item.get("severity", "info")).lower()
                if sev not in ("critical", "high", "medium", "low", "info"):
                    sev = "info"
                item["severity"] = sev

                enriched = EnrichedFinding(
                    module=item.get("module", "unknown"),
                    title=item.get("title", "Finding"),
                    evidence=item.get("evidence", ""),
                    meta=item.get("meta", {}),
                    severity=item["severity"],
                    explanation=item.get("explanation", "No explanation provided."),
                    remediation=item.get("remediation", "No remediation provided."),
                )
                enriched_list.append(enriched)
            except Exception as item_err:
                console.print(f"[dim yellow]Warning: Failed to validate finding item: {item_err}[/dim yellow]")

        # If count matches, return enriched
        if len(enriched_list) == len(batch):
            return enriched_list
        elif len(enriched_list) > 0:
            # Pad if count is mismatched
            matched_titles = {ef.title for ef in enriched_list}
            for rf in batch:
                if rf.title not in matched_titles:
                    enriched_list.append(create_fallback_finding(rf))
            return enriched_list
        else:
            raise ValueError("No valid enriched findings could be extracted from LLM response.")

    except Exception as exc:
        console.print(f"[yellow][!] Warning: LLM enrichment failed ({exc}). Applying offline fallback.[/yellow]")
        return [create_fallback_finding(rf, reason=f"LLM enrichment error ({exc}) — raw finding only") for rf in batch]


async def enrich_findings(raw_findings: list[RawFinding]) -> list[EnrichedFinding]:
    """
    Enrich all raw findings with LLM analysis in batches of ~10.
    Falls back gracefully if LLM calls fail.
    """
    if not raw_findings:
        return []

    config = get_llm_config()
    console.print(
        f"[bold magenta]🤖 Enriching {len(raw_findings)} finding(s) with {config['provider'].upper()} "
        f"({config['model']})...[/bold magenta]"
    )

    batch_size = 10
    enriched_results: list[EnrichedFinding] = []

    for i in range(0, len(raw_findings), batch_size):
        batch = raw_findings[i : i + batch_size]
        batch_enriched = await enrich_batch(
            batch=batch,
            base_url=config["base_url"],
            api_key=config["api_key"],
            model=config["model"],
        )
        enriched_results.extend(batch_enriched)

    return enriched_results
