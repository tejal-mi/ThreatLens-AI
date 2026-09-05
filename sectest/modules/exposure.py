"""
Security module to probe for sensitive files and exposed debug endpoints.
"""

import asyncio
import difflib
import uuid
import httpx
from sectest.core.schema import RawFinding, TargetConfig
from sectest.modules.base import SecurityModule

EXPOSURE_PATHS = [
    ".env",
    ".git/config",
    ".git/HEAD",
    "config.json",
    ".DS_Store",
    "backup.sql",
    "dump.sql",
    ".aws/credentials",
    "id_rsa",
    "wp-config.php",
    "debug",
    "__debug__",
]


class ExposureModule(SecurityModule):
    """Probes web targets for exposed configuration files, credentials, and debug endpoints."""

    name: str = "exposure"
    description: str = "Probes for sensitive files and exposed debug endpoints (.env, .git, backups, etc.)"

    async def run(self, target: TargetConfig) -> list[RawFinding]:
        findings: list[RawFinding] = []
        base_url = target.url.rstrip("/")

        semaphore = asyncio.Semaphore(5)
        timeout = httpx.Timeout(3.0)

        # 1. Establish baseline with a guaranteed nonexistent random path
        baseline_random_path = f"/sectest-nonexistent-{uuid.uuid4().hex[:12]}"
        baseline_url = f"{base_url}{baseline_random_path}"
        baseline_status = 404
        baseline_body = ""

        try:
            async with httpx.AsyncClient(verify=False, timeout=timeout, follow_redirects=True) as client:
                resp = await client.get(baseline_url, headers=target.headers)
                baseline_status = resp.status_code
                baseline_body = resp.text
        except Exception:
            # If even the baseline is unreachable, return empty findings
            return findings

        async def probe_path(client: httpx.AsyncClient, path: str) -> RawFinding | None:
            url = f"{base_url}/{path.lstrip('/')}"
            async with semaphore:
                try:
                    res = await client.get(url, headers=target.headers)
                except Exception:
                    return None

                # Only evaluate potential hits
                if res.status_code not in (200, 206):
                    return None

                res_body = res.text
                is_meaningful = False

                if baseline_status != 200:
                    # Baseline gave 404/other and probe gave 200/206 -> direct finding
                    is_meaningful = True
                else:
                    # Baseline also gave 200 (SPA catch-all router)
                    # Compare content similarity
                    if baseline_body == res_body:
                        is_meaningful = False
                    else:
                        matcher = difflib.SequenceMatcher(None, baseline_body, res_body)
                        similarity = matcher.ratio()
                        # If similarity is lower than 85%, or body size differs significantly (>30%)
                        len_diff = abs(len(res_body) - len(baseline_body)) / max(len(baseline_body), 1)
                        if similarity < 0.85 or len_diff > 0.3:
                            is_meaningful = True

                if is_meaningful:
                    # Format body snippet truncated to 200 chars
                    cleaned_body = " ".join(res_body.split())
                    snippet = cleaned_body[:200] + ("..." if len(cleaned_body) > 200 else "")
                    return RawFinding(
                        module=self.name,
                        title=f"Exposed Sensitive File or Endpoint: /{path}",
                        evidence=f"Status: {res.status_code}, Body: {snippet}",
                        meta={"path": path, "status_code": res.status_code, "url": url},
                    )
                return None

        try:
            async with httpx.AsyncClient(verify=False, timeout=timeout, follow_redirects=True) as client:
                tasks = [probe_path(client, path) for path in EXPOSURE_PATHS]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for res in results:
                    if isinstance(res, RawFinding):
                        findings.append(res)
        except Exception:
            pass

        return findings
