"""
Security module to test endpoints for safe, non-destructive SQLi, XSS, and Command Injection probes.
"""

import sys
import httpx
from rich.console import Console
from sectest.core.schema import EndpointConfig, RawFinding, TargetConfig
from sectest.modules.base import SecurityModule

if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(stderr=True, highlight=False)

SQLI_PROBES = [
    "' OR '1'='1",
    "1' ORDER BY 999--",
    "'",
]

SQL_ERROR_SIGNATURES = [
    "sql syntax",
    "operationalerror",
    "ora-",
    "unclosed quotation mark",
    "postgresql query failed",
    "sqlite3.operationalerror",
    "mysql_fetch",
    "microsoft ole db provider for sql server",
    "syntax error in query",
    "pg_query",
    "driver][db2/linux]",
    "you have an error in your sql syntax",
]

XSS_PROBES = [
    "<sectest-xss-probe>",
]

CMDI_PROBES = [
    "; echo sectest-cmdi-probe",
    "| echo sectest-cmdi-probe",
]


class InjectionModule(SecurityModule):
    """Audits configured endpoints using safe, non-destructive injection probes."""

    name: str = "injection"
    description: str = "Tests endpoints for safe, non-destructive SQLi, XSS, and Command Injection flaws (Opt-in)"

    async def run(self, target: TargetConfig) -> list[RawFinding]:
        findings: list[RawFinding] = []

        if not target.endpoints:
            return findings

        # Parse endpoint configs
        endpoint_objects: list[EndpointConfig] = []
        for ep in target.endpoints:
            if isinstance(ep, dict):
                endpoint_objects.append(EndpointConfig(**ep))
            else:
                endpoint_objects.append(ep)

        # Build list of (endpoint, param_name) combos
        combos: list[tuple[EndpointConfig, str]] = []
        for ep in endpoint_objects:
            if isinstance(ep.params, list):
                for p in ep.params:
                    combos.append((ep, str(p)))
            elif isinstance(ep.params, dict):
                for p in ep.params.keys():
                    combos.append((ep, str(p)))

        if not combos:
            return findings

        # Cap total combos at 30
        if len(combos) > 30:
            console.print(
                f"[yellow][!] Warning: Total injection parameter combinations ({len(combos)}) exceed cap of 30. "
                "Truncating to first 30 combinations.[/yellow]"
            )
            combos = combos[:30]

        base_url = target.url.rstrip("/")
        timeout = httpx.Timeout(3.0)

        async with httpx.AsyncClient(verify=False, timeout=timeout, follow_redirects=True) as client:
            for ep_cfg, param_name in combos:
                target_ep_url = f"{base_url}/{ep_cfg.path.lstrip('/')}"
                method = ep_cfg.method.upper()

                # --- 1. SQL Injection Probes ---
                for payload in SQLI_PROBES:
                    try:
                        if method == "POST":
                            data = {param_name: payload}
                            resp = await client.post(target_ep_url, json=data, headers=target.headers)
                        else:
                            params = {param_name: payload}
                            resp = await client.get(target_ep_url, params=params, headers=target.headers)

                        resp_text_lower = resp.text.lower()
                        for sig in SQL_ERROR_SIGNATURES:
                            if sig in resp_text_lower:
                                snippet = " ".join(resp.text.split())[:200]
                                findings.append(
                                    RawFinding(
                                        module=self.name,
                                        title=f"Potential SQL Injection: Database Error Signature on '{param_name}'",
                                        evidence=(
                                            f"Endpoint: {method} {ep_cfg.path}, Param: '{param_name}', "
                                            f"Payload: \"{payload}\", Signature: '{sig}', "
                                            f"Response Snippet: {snippet}"
                                        ),
                                        meta={
                                            "type": "sqli",
                                            "endpoint": ep_cfg.path,
                                            "param": param_name,
                                            "payload": payload,
                                            "signature": sig,
                                        },
                                    )
                                )
                                break
                    except Exception:
                        pass

                # --- 2. XSS Probes ---
                for payload in XSS_PROBES:
                    try:
                        if method == "POST":
                            data = {param_name: payload}
                            resp = await client.post(target_ep_url, json=data, headers=target.headers)
                        else:
                            params = {param_name: payload}
                            resp = await client.get(target_ep_url, params=params, headers=target.headers)

                        # Flag if exact marker appears unescaped in response
                        if payload in resp.text:
                            snippet = " ".join(resp.text.split())[:200]
                            findings.append(
                                RawFinding(
                                    module=self.name,
                                    title=f"Reflected Cross-Site Scripting (XSS) on Parameter '{param_name}'",
                                    evidence=(
                                        f"Endpoint: {method} {ep_cfg.path}, Param: '{param_name}', "
                                        f"Payload: \"{payload}\", "
                                        f"Response Snippet: {snippet}"
                                    ),
                                    meta={
                                        "type": "xss",
                                        "endpoint": ep_cfg.path,
                                        "param": param_name,
                                        "payload": payload,
                                    },
                                )
                            )
                    except Exception:
                        pass

                # --- 3. Command Injection Probes ---
                for payload in CMDI_PROBES:
                    try:
                        if method == "POST":
                            data = {param_name: payload}
                            resp = await client.post(target_ep_url, json=data, headers=target.headers)
                        else:
                            params = {param_name: payload}
                            resp = await client.get(target_ep_url, params=params, headers=target.headers)

                        if "sectest-cmdi-probe" in resp.text:
                            snippet = " ".join(resp.text.split())[:200]
                            findings.append(
                                RawFinding(
                                    module=self.name,
                                    title=f"Potential Command Injection on Parameter '{param_name}'",
                                    evidence=(
                                        f"Endpoint: {method} {ep_cfg.path}, Param: '{param_name}', "
                                        f"Payload: \"{payload}\", "
                                        f"Response Snippet: {snippet}"
                                    ),
                                    meta={
                                        "type": "cmdi",
                                        "endpoint": ep_cfg.path,
                                        "param": param_name,
                                        "payload": payload,
                                    },
                                )
                            )
                    except Exception:
                        pass

        return findings
