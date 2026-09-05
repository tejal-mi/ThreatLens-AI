"""
Main CLI entrypoint for sectest using Typer.
"""

import asyncio
import json
from pathlib import Path
import sys
from typing import Optional
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
import typer

# Ensure UTF-8 encoding for Windows standard output and error
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from sectest.config import assert_local_target
from sectest.core.llm import enrich_findings
from sectest.core.runner import run_pipeline
from sectest.core.schema import EnrichedFinding, TargetConfig
from sectest.modules import ALL_MODULES, resolve_modules
from sectest.report import print_terminal_report, write_html_report, write_json_report, serve_report

# Load environment configuration
load_dotenv()

app = typer.Typer(
    name="sectest",
    help="Standalone security testing CLI tool for locally hosted servers with LLM enrichment and interactive reports.",
    add_completion=False,
)

console = Console(highlight=False)
err_console = Console(stderr=True, highlight=False)


@app.command(name="list-checks")
def list_checks() -> None:
    """
    List all available security check modules and their descriptions.
    """
    table = Table(
        title="[bold cyan]Available SecTest Security Modules[/bold cyan]",
        border_style="cyan",
        header_style="bold magenta",
    )
    table.add_column("Module Name", style="bold green", width=15)
    table.add_column("Type", style="yellow", width=12)
    table.add_column("Description", style="white")

    for mod_cls in ALL_MODULES:
        mod = mod_cls()
        mod_type = "Opt-in" if "(Opt-in)" in mod.description else "Active"
        desc = mod.description.replace(" (Opt-in)", "")
        table.add_row(mod.name, mod_type, desc)

    console.print()
    console.print(table)
    console.print()


@app.command(name="scan")
def scan(
    target: str = typer.Option(
        ...,
        "--target",
        "-t",
        help="Target base URL (e.g. http://localhost:8000)",
    ),
    checks: str = typer.Option(
        "all",
        "--checks",
        "-c",
        help="Comma-separated module names to execute, or 'all'",
    ),
    out: Optional[str] = typer.Option(
        None,
        "--out",
        "-o",
        help="Output report file path (.json or .html determines format)",
    ),
    html_out: bool = typer.Option(
        False,
        "--html",
        help="Generate an HTML report (saved to sectest_report.html if --out is not provided)",
    ),
    serve: bool = typer.Option(
        False,
        "--serve",
        "-s",
        help="Locally host the animated HTML report on a local URL after scanning",
    ),
    port: int = typer.Option(
        8765,
        "--port",
        "-p",
        help="Port for the local report server (default: 8765)",
    ),
    open_browser: bool = typer.Option(
        True,
        "--open/--no-open",
        help="Automatically open the default web browser when hosting report",
    ),
    auth_header: Optional[str] = typer.Option(
        None,
        "--auth-header",
        help="Sets Authorization header (e.g. 'Bearer <token>')",
    ),
    endpoints: Optional[str] = typer.Option(
        None,
        "--endpoints",
        help="Path to JSON file matching endpoints schema for injection testing",
    ),
    auth_endpoint: Optional[str] = typer.Option(
        None,
        "--auth-endpoint",
        help="Path to JSON file matching authEndpoint schema for login rate-limit testing",
    ),
    no_llm: bool = typer.Option(
        False,
        "--no-llm",
        help="Skip LLM enrichment, mapping raw findings to info severity",
    ),
) -> None:
    """
    Run security checks against a local server and optionally enrich findings via LLM and host HTML report.
    """
    # 1. Safety Guard Verification
    try:
        assert_local_target(target)
    except ValueError as exc:
        err_console.print(
            Panel(
                f"[bold red]Safety Guard Violation:[/bold red]\n{exc}",
                title="[bold red]⛔ Target Disallowed[/bold red]",
                border_style="red",
            )
        )
        raise typer.Exit(code=1)

    # 2. Resolve modules
    try:
        active_modules = resolve_modules(checks)
    except ValueError as exc:
        err_console.print(f"[bold red]Configuration Error:[/bold red] {exc}")
        raise typer.Exit(code=1)

    # 3. Load optional JSON configuration files
    headers: dict[str, str] = {}
    if auth_header:
        headers["Authorization"] = auth_header

    endpoints_data = None
    if endpoints:
        ep_path = Path(endpoints)
        if not ep_path.exists():
            err_console.print(f"[bold red]File Error:[/bold red] Endpoints file '{endpoints}' not found.")
            raise typer.Exit(code=1)
        try:
            with open(ep_path, "r", encoding="utf-8") as f:
                endpoints_data = json.load(f)
        except Exception as exc:
            err_console.print(f"[bold red]JSON Parse Error:[/bold red] Failed to parse '{endpoints}': {exc}")
            raise typer.Exit(code=1)

    auth_endpoint_data = None
    if auth_endpoint:
        auth_path = Path(auth_endpoint)
        if not auth_path.exists():
            err_console.print(f"[bold red]File Error:[/bold red] Auth endpoint file '{auth_endpoint}' not found.")
            raise typer.Exit(code=1)
        try:
            with open(auth_path, "r", encoding="utf-8") as f:
                auth_endpoint_data = json.load(f)
        except Exception as exc:
            err_console.print(f"[bold red]JSON Parse Error:[/bold red] Failed to parse '{auth_endpoint}': {exc}")
            raise typer.Exit(code=1)

    target_config = TargetConfig(
        url=target,
        headers=headers,
        authEndpoint=auth_endpoint_data,
        endpoints=endpoints_data,
    )

    # 4. Execute Pipeline
    raw_findings, errors = asyncio.run(run_pipeline(target_config, active_modules))

    # 5. Enrich findings via LLM or fallback
    if no_llm:
        enriched_findings = [
            EnrichedFinding(
                module=rf.module,
                title=rf.title,
                evidence=rf.evidence,
                meta=rf.meta,
                severity="info",
                explanation="LLM enrichment skipped (--no-llm specified).",
                remediation="Manual security evaluation required.",
            )
            for rf in raw_findings
        ]
    else:
        enriched_findings = asyncio.run(enrich_findings(raw_findings))

    # 6. Render Terminal Report
    print_terminal_report(enriched_findings, errors)

    # 7. Determine Report Export Destinations
    html_report_path: Optional[Path] = None

    if out:
        out_path = Path(out)
        suffix = out_path.suffix.lower()

        if suffix == ".json":
            write_json_report(enriched_findings, errors, str(out_path))
            console.print(f"[bold green]✔ Saved JSON report to:[/] [cyan]{out_path.resolve()}[/cyan]")
        elif suffix in (".html", ".htm"):
            write_html_report(enriched_findings, errors, target_config, str(out_path))
            html_report_path = out_path.resolve()
            console.print(f"[bold green]✔ Saved HTML report to:[/] [cyan]{html_report_path}[/cyan]")
        else:
            err_console.print(
                f"[yellow]Warning: Unknown output extension '{suffix}'. Saving as JSON by default.[/yellow]"
            )
            write_json_report(enriched_findings, errors, str(out_path))
            console.print(f"[bold green]✔ Saved JSON report to:[/] [cyan]{out_path.resolve()}[/cyan]")

    # If --html or --serve is passed and no HTML path was created yet, generate default HTML report
    if (html_out or serve) and html_report_path is None:
        default_html = Path("sectest_report.html").resolve()
        write_html_report(enriched_findings, errors, target_config, str(default_html))
        html_report_path = default_html
        console.print(f"[bold green]✔ Generated HTML report:[/] [cyan]{html_report_path}[/cyan]")

    # 8. Locally Host Report if requested
    if serve and html_report_path:
        serve_report(html_report_path, port=port, open_browser=open_browser)


@app.command(name="serve")
def serve(
    report: str = typer.Argument(
        "sectest_report.html",
        help="Path to the HTML report file to serve locally",
    ),
    port: int = typer.Option(
        8765,
        "--port",
        "-p",
        help="Port for the local report server (default: 8765)",
    ),
    open_browser: bool = typer.Option(
        True,
        "--open/--no-open",
        help="Automatically open the default web browser when hosting report",
    ),
) -> None:
    """
    Host a previously generated SecTest HTML security report on a local URL.
    """
    report_path = Path(report).resolve()
    if not report_path.exists():
        err_console.print(f"[bold red]File Error:[/] Report file '{report_path}' not found.")
        raise typer.Exit(code=1)

    serve_report(report_path, port=port, open_browser=open_browser)


if __name__ == "__main__":
    app()
