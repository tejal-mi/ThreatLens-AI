"""
Sequential execution runner for sectest security module pipeline.
"""

import sys
from rich.console import Console
from sectest.core.schema import RawFinding, TargetConfig
from sectest.modules.base import SecurityModule

if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(stderr=True, highlight=False)


async def run_pipeline(
    target: TargetConfig, modules: list[SecurityModule]
) -> tuple[list[RawFinding], list[str]]:
    """
    Execute security modules sequentially against the target.
    Logs progress to stderr via Rich and catches per-module exceptions gracefully.

    Returns:
        tuple[list[RawFinding], list[str]]: (all discovered findings, list of error messages)
    """
    all_findings: list[RawFinding] = []
    errors: list[str] = []

    console.print(f"\n[bold blue]─── Starting Security Pipeline Scan against [white]{target.url}[/white] ───[/bold blue]")

    for module in modules:
        console.print(f"[bold cyan]▶ Checking module:[/] [white]{module.name}[/] [dim]({module.description})[/]")
        try:
            findings = await module.run(target)
            all_findings.extend(findings)
            if findings:
                console.print(f"  [yellow]↳ Found {len(findings)} issue(s)[/yellow]")
            else:
                console.print("  [dim green]↳ No issues detected[/dim green]")
        except Exception as exc:
            error_msg = f"Module '{module.name}' encountered an error: {exc}"
            console.print(f"  [bold red]✖ {error_msg}[/bold red]")
            errors.append(error_msg)

    console.print(f"[bold blue]─── Completed Pipeline ({len(all_findings)} raw findings, {len(errors)} errors) ───[/bold blue]\n")
    return all_findings, errors
