"""
Pydantic v2 schemas and data models for sectest.
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuthEndpointConfig(BaseModel):
    """Configuration for an authentication/login endpoint."""
    model_config = ConfigDict(populate_by_name=True)

    path: str
    method: str = "POST"
    usernameField: str = Field(default="username", alias="username_field")
    passwordField: str = Field(default="password", alias="password_field")


class EndpointConfig(BaseModel):
    """Configuration for an endpoint to test for injection vulnerabilities."""
    model_config = ConfigDict(populate_by_name=True)

    path: str
    method: str = "GET"
    params: list[str] | dict[str, Any] = Field(default_factory=list)


class TargetConfig(BaseModel):
    """Configuration representing a target server and associated audit parameters."""
    model_config = ConfigDict(populate_by_name=True)

    url: str
    headers: dict[str, str] = Field(default_factory=dict)
    authEndpoint: Optional[dict[str, Any] | AuthEndpointConfig] = Field(default=None, alias="auth_endpoint")
    endpoints: Optional[list[dict[str, Any] | EndpointConfig]] = None


class RawFinding(BaseModel):
    """Unenriched raw finding directly reported by a security testing module."""
    model_config = ConfigDict(populate_by_name=True)

    module: str
    title: str
    evidence: str
    meta: dict[str, Any] = Field(default_factory=dict)


class EnrichedFinding(RawFinding):
    """Finding enriched with LLM-analyzed severity, explanation, and remediation guidance."""
    severity: Literal["critical", "high", "medium", "low", "info"]
    explanation: str
    remediation: str
