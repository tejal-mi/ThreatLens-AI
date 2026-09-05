"""
Rich terminal reporter for sectest findings.
"""

import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from sectest.core.schema import EnrichedFinding

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SEVERITY_STYLES = {
    "critical": "bold red",
    "high": "red",
    "medium": "yellow",
    "low": "blue",
    "info": "dim white",
}

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]


def print_terminal_report(findings: list[EnrichedFinding], errors: list[str]) -> None:
    """
    Render a rich terminal report with summary metrics, color-coded findings table,
    and errors section.
    """
    console = Console(highlight=False)

    # Calculate counts per severity
    counts = {s: 0 for s in SEVERITY_ORDER}
    for f in findings:
        sev = f.severity.lower()
        if sev in counts:
            counts[sev] += 1
        else:
            counts["info"] += 1

    total = len(findings)

    # 1. Summary Panel
    summary_text = Text()
    summary_text.append(f"Total Findings: {total}    │    ", style="bold white")
    summary_text.append(f"CRITICAL: {counts['critical']}  ", style="bold red")
    summary_text.append(f"HIGH: {counts['high']}  ", style="red")
    summary_text.append(f"MEDIUM: {counts['medium']}  ", style="yellow")
    summary_text.append(f"LOW: {counts['low']}  ", style="blue")
    summary_text.append(f"INFO: {counts['info']}", style="dim white")

    console.print()
    console.print(
        Panel(
            summary_text,
            title="[bold green]🛡️  SECTEST AUDIT SUMMARY[/bold green]",
            border_style="bright_blue",
            expand=False,
        )
    )

    # 2. Findings Table
    if findings:
        table = Table(
            title="[bold white]Security Audit Findings[/bold white]",
            border_style="cyan",
            show_header=True,
            header_style="bold magenta",
        )
        table.add_column("Severity", justify="center", style="bold", width=12)
        table.add_column("Module", style="cyan", width=12)
        table.add_column("Title", style="white", min_width=30)
        table.add_column("Evidence", style="dim", max_width=60, overflow="ellipsis")

        # Sort findings by severity order
        sorted_findings = sorted(
            findings,
            key=lambda x: SEVERITY_ORDER.index(x.severity.lower()) if x.severity.lower() in SEVERITY_ORDER else 99,
        )

        for f in sorted_findings:
            sev_lower = f.severity.lower()
            style = SEVERITY_STYLES.get(sev_lower, "white")
            evidence_snippet = f.evidence.strip()
            if len(evidence_snippet) > 60:
                evidence_snippet = evidence_snippet[:57] + "..."

            table.add_row(
                Text(f.severity.upper(), style=style),
                f.module,
                f.title,
                evidence_snippet,
            )

        console.print(table)
    else:
        console.print(
            Panel(
                "[bold green]✔ No security issues or weaknesses detected during this audit scan.[/bold green]",
                border_style="green",
                expand=False,
            )
        )

    # 3. Errors Panel (if any errors occurred)
    if errors:
        error_lines = "\n".join(f"• {err}" for err in errors)
        console.print()
        console.print(
            Panel(
                f"[bold red]Errors occurred during pipeline execution:[/bold red]\n\n{error_lines}",
                title="[bold red]⚠️  Pipeline Execution Warnings / Errors[/bold red]",
                border_style="red",
                expand=False,
            )
        )
    console.print()
