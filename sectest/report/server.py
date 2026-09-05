"""
Local HTTP report server for hosting SecTest security reports.
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
from pathlib import Path
import socket
import sys
import threading
from typing import Optional
import urllib.parse
import webbrowser
from rich.console import Console
from rich.panel import Panel

console = Console(highlight=False)


def find_available_port(start_port: int = 8765, max_attempts: int = 50, host: str = "127.0.0.1") -> int:
    """
    Find an available port starting from start_port.
    """
    for p in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, p))
                return p
            except OSError:
                continue
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")


class ReportHTTPRequestHandler(SimpleHTTPRequestHandler):
    """
    Custom HTTP request handler that serves the generated HTML report and suppresses noisy logs.
    """
    report_file_path: Path

    def log_message(self, format: str, *args: object) -> None:
        # Suppress noisy standard HTTP access logs
        pass

    def do_GET(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path in ("/", "/index.html", f"/{self.report_file_path.name}"):
            if not self.report_file_path.exists():
                self.send_error(404, f"Report file '{self.report_file_path.name}' not found.")
                return

            try:
                content = self.report_file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(content)
            except Exception as exc:
                self.send_error(500, f"Error reading report: {exc}")
        elif path in ("/report.json", "/api/findings"):
            # If an adjacent or specified JSON exists, serve it
            json_file = self.report_file_path.with_suffix(".json")
            if json_file.exists():
                try:
                    content = json_file.read_bytes()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
                except Exception:
                    pass
            self.send_error(404, "JSON findings not found")
        else:
            self.send_error(404, "Not Found")


def create_report_server(
    report_path: Path | str,
    port: int = 8765,
    host: str = "127.0.0.1",
) -> tuple[HTTPServer, int]:
    """
    Create and bind an HTTPServer instance serving the given report file.
    """
    path_obj = Path(report_path).resolve()
    if not path_obj.exists():
        raise FileNotFoundError(f"Report file '{report_path}' does not exist.")

    actual_port = find_available_port(start_port=port, host=host)

    class CustomHandler(ReportHTTPRequestHandler):
        report_file_path = path_obj

    server = HTTPServer((host, actual_port), CustomHandler)
    return server, actual_port


def serve_report(
    report_path: Path | str,
    port: int = 8765,
    open_browser: bool = True,
    host: str = "127.0.0.1",
) -> None:
    """
    Host the HTML security report on a local web server with automatic port resolution and clean terminal status.
    """
    path_obj = Path(report_path).resolve()
    if not path_obj.exists():
        console.print(f"[bold red]Error:[/] Report file '{path_obj}' does not exist.")
        return

    try:
        server, actual_port = create_report_server(path_obj, port=port, host=host)
    except Exception as exc:
        console.print(f"[bold red]Failed to start report server:[/] {exc}")
        return

    local_url = f"http://{host}:{actual_port}"
    network_url = f"http://localhost:{actual_port}"

    panel_content = (
        f"[bold cyan]Local URL:[/]   [bold underline green]{local_url}[/]\n"
        f"[bold cyan]Loopback:[/]    [dim]{network_url}[/]\n"
        f"[bold cyan]Serving:[/]     [dim]{path_obj}[/]\n\n"
        f"[bold yellow]Press Ctrl+C to stop the report server.[/]"
    )

    console.print()
    console.print(
        Panel(
            panel_content,
            title="[bold green]🛡️  SecTest Local Report Server Active[/bold green]",
            border_style="green",
            expand=False,
        )
    )
    console.print()

    if open_browser:
        try:
            webbrowser.open(local_url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        console.print("\n[yellow]Shutting down local report server...[/yellow]")
    finally:
        server.server_close()
        console.print("[dim]Report server stopped.[/dim]")
