"""
Configuration and safety guard assertions for sectest.
"""

import ipaddress
import os
import socket
import urllib.parse
from pathlib import Path
from dotenv import find_dotenv, load_dotenv

# Ensure environment variables are loaded
_pkg_root_env = Path(__file__).resolve().parent.parent / ".env"
if _pkg_root_env.exists():
    load_dotenv(dotenv_path=_pkg_root_env)
load_dotenv(find_dotenv(usecwd=True))

PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def is_local_or_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address is loopback, link-local, or within a private subnet."""
    if ip.is_loopback or ip.is_private or ip.is_link_local:
        return True
    return any(ip in net for net in PRIVATE_NETWORKS)


def assert_local_target(url: str) -> None:
    """
    Safety guard that validates the target URL resolves strictly to localhost
    or a private IP range. Raises ValueError if the target is public or invalid.
    """
    if not url:
        raise ValueError("Target URL cannot be empty.")

    target_url = url
    if not target_url.startswith(("http://", "https://")):
        target_url = f"http://{target_url}"

    parsed = urllib.parse.urlparse(target_url)
    hostname = parsed.hostname

    if not hostname:
        raise ValueError(f"Invalid target URL: unable to extract hostname from '{url}'.")

    # Direct check for localhost domain
    normalized_host = hostname.lower().strip()
    if normalized_host == "localhost" or normalized_host.endswith(".localhost"):
        return

    # Check if hostname is directly an IP literal
    try:
        ip_obj = ipaddress.ip_address(normalized_host)
        if not is_local_or_private_ip(ip_obj):
            raise ValueError(
                f"Target '{url}' points to public IP address '{normalized_host}'. "
                "sectest strictly allows scanning only local/private network targets."
            )
        return
    except ValueError as e:
        # If it wasn't a valid IP literal and wasn't our explicit error, continue to DNS resolution
        if "sectest strictly allows" in str(e):
            raise

    # Resolve hostname via DNS
    try:
        addr_info = socket.getaddrinfo(normalized_host, None)
    except socket.gaierror as e:
        raise ValueError(f"Failed to resolve target hostname '{hostname}': {e}") from e

    if not addr_info:
        raise ValueError(f"No IP addresses found for target hostname '{hostname}'.")

    for item in addr_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            if not is_local_or_private_ip(ip_obj):
                raise ValueError(
                    f"Target '{url}' resolved to public IP address '{ip_str}'. "
                    "sectest strictly allows scanning only local/private network targets."
                )
        except ValueError as e:
            if "sectest strictly allows" in str(e):
                raise
            raise ValueError(f"Invalid resolved IP '{ip_str}' for target '{url}': {e}") from e


def get_llm_config() -> dict[str, str]:
    """Retrieve LLM provider and model configuration from environment."""
    provider = os.getenv("LLM_PROVIDER", "groq").lower().strip()
    groq_key = os.getenv("GROQ_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")

    if provider == "groq":
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        api_key = groq_key
        base_url = "https://api.groq.com/openai/v1/chat/completions"
    elif provider == "openrouter":
        model = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct")
        api_key = openrouter_key
        base_url = "https://openrouter.ai/api/v1/chat/completions"
    else:
        # Fallback to groq
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        api_key = groq_key
        base_url = "https://api.groq.com/openai/v1/chat/completions"

    return {
        "provider": provider,
        "model": model,
        "api_key": api_key,
        "base_url": base_url,
    }
