"""
JSON reporter for sectest findings.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from sectest.core.schema import EnrichedFinding

SEVERITY_KEYS = ["critical", "high", "medium", "low", "info"]


def write_json_report(
    findings: list[EnrichedFinding],
    errors: list[str],
    out_path: str,
) -> None:
    """
    Export findings, execution errors, and summary counts to a structured JSON report file.
    """
    by_severity = {s: 0 for s in SEVERITY_KEYS}
    for f in findings:
        sev = f.severity.lower()
        if sev in by_severity:
            by_severity[sev] += 1
        else:
            by_severity["info"] += 1

    report_data = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total": len(findings),
            "by_severity": by_severity,
        },
        "findings": [f.model_dump() for f in findings],
        "errors": errors,
    }

    target_file = Path(out_path)
    target_file.parent.mkdir(parents=True, exist_ok=True)

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
