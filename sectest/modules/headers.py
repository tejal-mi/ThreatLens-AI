"""
Security module to audit HTTP response headers for security best practices and leakage.
"""

import httpx
from sectest.core.schema import RawFinding, TargetConfig
from sectest.modules.base import SecurityModule


class HeadersModule(SecurityModule):
    """Audits HTTP headers for missing security controls and information disclosure."""

    name: str = "headers"
    description: str = "Inspects HTTP response headers for security best practices and information leakage"

    async def run(self, target: TargetConfig) -> list[RawFinding]:
        findings: list[RawFinding] = []

        try:
            async with httpx.AsyncClient(verify=False, timeout=5.0, follow_redirects=True) as client:
                response = await client.get(target.url, headers=target.headers)
        except httpx.RequestError as e:
            # Return gracefully with no findings on network error
            return findings

        headers = response.headers

        # 1. Content-Security-Policy
        csp = headers.get("content-security-policy")
        if not csp:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Missing Content-Security-Policy (CSP) Header",
                    evidence="not present",
                    meta={"header": "Content-Security-Policy", "status_code": response.status_code},
                )
            )
        else:
            csp_lower = csp.lower()
            if "'unsafe-inline'" in csp_lower or "unsafe-inline" in csp_lower or "*" in csp_lower:
                findings.append(
                    RawFinding(
                        module=self.name,
                        title="Weak Content-Security-Policy (CSP) Header",
                        evidence=f"Value: '{csp}' (contains unsafe-inline or wildcard)",
                        meta={"header": "Content-Security-Policy", "value": csp},
                    )
                )

        # 2. Strict-Transport-Security (HSTS)
        hsts = headers.get("strict-transport-security")
        if not hsts:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Missing Strict-Transport-Security (HSTS) Header",
                    evidence="not present (Note: HSTS is less critical on plain HTTP/localhost, but recommended in production)",
                    meta={"header": "Strict-Transport-Security"},
                )
            )

        # 3. X-Frame-Options
        xfo = headers.get("x-frame-options")
        if not xfo:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Missing X-Frame-Options Header",
                    evidence="not present",
                    meta={"header": "X-Frame-Options"},
                )
            )

        # 4. X-Content-Type-Options
        xcto = headers.get("x-content-type-options")
        if not xcto:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Missing X-Content-Type-Options Header",
                    evidence="not present",
                    meta={"header": "X-Content-Type-Options"},
                )
            )
        elif xcto.strip().lower() != "nosniff":
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Misconfigured X-Content-Type-Options Header",
                    evidence=f"Value: '{xcto}' (expected 'nosniff')",
                    meta={"header": "X-Content-Type-Options", "value": xcto},
                )
            )

        # 5. Referrer-Policy
        ref_pol = headers.get("referrer-policy")
        if not ref_pol:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Missing Referrer-Policy Header",
                    evidence="not present",
                    meta={"header": "Referrer-Policy"},
                )
            )

        # 6. Dangerous CORS combo (Access-Control-Allow-Origin: * WITH Access-Control-Allow-Credentials: true)
        acao = headers.get("access-control-allow-origin")
        acac = headers.get("access-control-allow-credentials")
        if acao and acac:
            if acao.strip() == "*" and acac.strip().lower() == "true":
                findings.append(
                    RawFinding(
                        module=self.name,
                        title="Dangerous CORS Configuration: Wildcard Origin with Credentials",
                        evidence=f"Access-Control-Allow-Origin: '{acao}', Access-Control-Allow-Credentials: '{acac}'",
                        meta={"Access-Control-Allow-Origin": acao, "Access-Control-Allow-Credentials": acac},
                    )
                )

        # 7. Server / X-Powered-By headers leaking framework/version info
        server = headers.get("server")
        if server:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Information Disclosure: Server Header Leaking Version/Software Info",
                    evidence=f"Server: '{server}'",
                    meta={"header": "Server", "value": server},
                )
            )

        x_powered_by = headers.get("x-powered-by")
        if x_powered_by:
            findings.append(
                RawFinding(
                    module=self.name,
                    title="Information Disclosure: X-Powered-By Header Leaking Framework Info",
                    evidence=f"X-Powered-By: '{x_powered_by}'",
                    meta={"header": "X-Powered-By", "value": x_powered_by},
                )
            )

        return findings
