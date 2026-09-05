"""
Security module to audit JWT authentication tokens and login rate limiting.
"""

import base64
import json
import time
from typing import Any
import httpx
from sectest.core.schema import AuthEndpointConfig, RawFinding, TargetConfig
from sectest.modules.base import SecurityModule


def decode_jwt_part(segment: str) -> dict[str, Any] | None:
    """Safely decode a base64url JWT header or payload segment."""
    try:
        rem = len(segment) % 4
        if rem > 0:
            segment += "=" * (4 - rem)
        decoded = base64.urlsafe_b64decode(segment.encode("utf-8"))
        return json.loads(decoded.decode("utf-8"))
    except Exception:
        return None


class AuthModule(SecurityModule):
    """Audits JWT tokens for cryptographic and lifecycle weaknesses and checks login rate limiting."""

    name: str = "auth"
    description: str = "Audits JWT authentication tokens and login endpoint rate limiting / lockout (Opt-in)"

    async def run(self, target: TargetConfig) -> list[RawFinding]:
        findings: list[RawFinding] = []

        # 1. JWT Audit (if Bearer token is present in headers)
        auth_header = None
        for key, value in target.headers.items():
            if key.lower() == "authorization":
                auth_header = value
                break

        if auth_header and auth_header.strip().startswith("Bearer "):
            token = auth_header.strip()[7:].strip()
            parts = token.split(".")
            if len(parts) == 3:
                header = decode_jwt_part(parts[0])
                payload = decode_jwt_part(parts[1])

                if header is not None:
                    alg = str(header.get("alg", "")).strip()
                    if alg.lower() == "none":
                        findings.append(
                            RawFinding(
                                module=self.name,
                                title="JWT Utilizes Insecure 'none' Algorithm",
                                evidence=f"Decoded Header: {json.dumps(header)}",
                                meta={"jwt_header": header, "risk": "critical"},
                            )
                        )
                    elif alg.upper() == "HS256":
                        findings.append(
                            RawFinding(
                                module=self.name,
                                title="JWT Uses Symmetric HS256 Algorithm — Verify Secret Strength Manually",
                                evidence=f"Decoded Header: {json.dumps(header)}",
                                meta={"jwt_header": header, "alg": "HS256"},
                            )
                        )

                if payload is not None:
                    if "exp" not in payload:
                        findings.append(
                            RawFinding(
                                module=self.name,
                                title="JWT Missing Expiration ('exp') Claim — Token Never Expires",
                                evidence=f"Decoded Payload: {json.dumps(payload)}",
                                meta={"claims": list(payload.keys())},
                            )
                        )
                    else:
                        exp = payload.get("exp")
                        iat = payload.get("iat")
                        now = time.time()

                        if isinstance(exp, (int, float)) and isinstance(iat, (int, float)):
                            duration_seconds = exp - iat
                            if duration_seconds > 30 * 86400:
                                days = duration_seconds / 86400
                                findings.append(
                                    RawFinding(
                                        module=self.name,
                                        title="Excessively Long-Lived JWT Token (>30 Days Expiration)",
                                        evidence=f"Token lifetime is {days:.1f} days (iat: {iat}, exp: {exp})",
                                        meta={"iat": iat, "exp": exp, "lifetime_days": days},
                                    )
                                )
                        elif isinstance(exp, (int, float)):
                            future_seconds = exp - now
                            if future_seconds > 30 * 86400:
                                days = future_seconds / 86400
                                findings.append(
                                    RawFinding(
                                        module=self.name,
                                        title="Excessively Long-Lived JWT Token (>30 Days Expiration)",
                                        evidence=f"Token expiration is {days:.1f} days in the future (exp: {exp})",
                                        meta={"exp": exp, "future_days": days},
                                    )
                                )

        # 2. Login Endpoint Rate Limiting Audit (if authEndpoint config is provided)
        auth_config = target.authEndpoint
        if auth_config:
            if isinstance(auth_config, dict):
                auth_obj = AuthEndpointConfig(**auth_config)
            else:
                auth_obj = auth_config

            base_url = target.url.rstrip("/")
            endpoint_url = f"{base_url}/{auth_obj.path.lstrip('/')}"
            method = auth_obj.method.upper()

            statuses: list[int] = []
            got_rate_limited = False

            try:
                async with httpx.AsyncClient(verify=False, timeout=3.0) as client:
                    for i in range(6):
                        payload_data = {
                            auth_obj.usernameField: f"sectest_probe_{i}@invalid.test",
                            auth_obj.passwordField: f"WrongPassword_{i}!987",
                        }
                        try:
                            if method == "POST":
                                resp = await client.post(endpoint_url, json=payload_data, headers=target.headers)
                            elif method == "GET":
                                resp = await client.get(endpoint_url, params=payload_data, headers=target.headers)
                            else:
                                resp = await client.request(
                                    method, endpoint_url, json=payload_data, headers=target.headers
                                )

                            statuses.append(resp.status_code)
                            if resp.status_code in (429, 423) or "rate limit" in resp.text.lower() or "locked out" in resp.text.lower():
                                got_rate_limited = True
                                break
                        except Exception:
                            # If connection dropped or failed
                            pass
            except Exception:
                pass

            if statuses and not got_rate_limited:
                status_summary = ", ".join(str(s) for s in statuses)
                findings.append(
                    RawFinding(
                        module=self.name,
                        title="No Rate Limiting Detected on Login Endpoint After 6 Rapid Failed Attempts",
                        evidence=f"Sent 6 rapid login requests to '{auth_obj.path}'. Status codes received: [{status_summary}]. No 429 or lockout enforcement observed.",
                        meta={"endpoint": auth_obj.path, "attempts": len(statuses), "statuses": statuses},
                    )
                )

        return findings
