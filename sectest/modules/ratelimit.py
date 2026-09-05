"""
Security module to perform a controlled resilience and rate limiting check.

NOTE: This module performs a controlled, intentionally conservative resilience
check (hard-capped at 20 requests). It is NOT a load, stress, or DDoS test.
"""

import time
import httpx
from sectest.core.schema import RawFinding, TargetConfig
from sectest.modules.base import SecurityModule

# Hard cap: never send more than 20 requests, no exceptions
MAX_BURST_REQUESTS = 20


class RateLimitModule(SecurityModule):
    """Audits general server responsiveness and rate limiting under a small controlled burst."""

    name: str = "ratelimit"
    description: str = "Controlled resilience check: audits general rate limiting and stability (max 20 requests)"

    async def run(self, target: TargetConfig) -> list[RawFinding]:
        findings: list[RawFinding] = []

        durations: list[float] = []
        statuses: list[int] = []
        error_count = 0
        error_messages: list[str] = []

        timeout = httpx.Timeout(3.0)
        start_time = time.perf_counter()

        async with httpx.AsyncClient(verify=False, timeout=timeout, follow_redirects=True) as client:
            for i in range(MAX_BURST_REQUESTS):
                req_start = time.perf_counter()
                try:
                    resp = await client.get(target.url, headers=target.headers)
                    req_duration = time.perf_counter() - req_start
                    durations.append(req_duration)
                    statuses.append(resp.status_code)

                    # Check for server-side error instability (500, 502, 503, 504)
                    if resp.status_code >= 500:
                        error_count += 1
                        error_messages.append(f"HTTP {resp.status_code}")

                except httpx.TimeoutException:
                    error_count += 1
                    error_messages.append("Request timed out (>3.0s)")
                except Exception as e:
                    error_count += 1
                    error_messages.append(str(e))

                # If server shows instability under modest load, abort immediately
                if error_count >= 2:
                    completed = len(durations)
                    findings.append(
                        RawFinding(
                            module=self.name,
                            title="Server Showed Instability Under Modest Burst Load",
                            evidence=(
                                f"Encountered {error_count} server errors/timeouts during a modest 20-request check. "
                                f"Aborted check after {completed} requests to protect target server. "
                                f"Observed errors: {', '.join(error_messages)}."
                            ),
                            meta={"completed_requests": completed, "errors": error_messages},
                        )
                    )
                    return findings

        total_time = time.perf_counter() - start_time

        # Check if rate limiting (HTTP 429) was triggered
        if 429 in statuses:
            # Server properly rate-limits
            return findings

        # If all requests succeeded without 429 and no throttling
        if len(durations) >= 10:
            first_5 = durations[:5]
            last_5 = durations[-5:]
            avg_first = sum(first_5) / len(first_5)
            avg_last = sum(last_5) / len(last_5)

            findings.append(
                RawFinding(
                    module=self.name,
                    title="No Rate Limiting Observed After 20 Rapid Requests",
                    evidence=(
                        f"Sent {len(durations)} rapid GET requests in {total_time:.2f}s with no HTTP 429 throttling. "
                        f"Average response time: first 5 = {avg_first * 1000:.1f}ms, last 5 = {avg_last * 1000:.1f}ms."
                    ),
                    meta={
                        "total_requests": len(durations),
                        "total_time_seconds": round(total_time, 2),
                        "avg_first_5_ms": round(avg_first * 1000, 1),
                        "avg_last_5_ms": round(avg_last * 1000, 1),
                    },
                )
            )

        return findings
