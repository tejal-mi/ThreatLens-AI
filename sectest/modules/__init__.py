"""
Security modules registry for sectest.
"""

from typing import Type
from sectest.modules.base import SecurityModule
from sectest.modules.headers import HeadersModule
from sectest.modules.exposure import ExposureModule
from sectest.modules.auth import AuthModule
from sectest.modules.injection import InjectionModule
from sectest.modules.ratelimit import RateLimitModule

ALL_MODULES: list[Type[SecurityModule]] = [
    HeadersModule,
    ExposureModule,
    AuthModule,
    InjectionModule,
    RateLimitModule,
]

MODULE_REGISTRY: dict[str, Type[SecurityModule]] = {
    mod.name: mod for mod in ALL_MODULES
}


def get_available_modules() -> dict[str, Type[SecurityModule]]:
    """Return dictionary of registered security modules."""
    return MODULE_REGISTRY


def resolve_modules(checks_str: str) -> list[SecurityModule]:
    """
    Resolve comma-separated module names or 'all' to instantiated SecurityModule instances.
    """
    if checks_str.strip().lower() == "all":
        return [mod_cls() for mod_cls in ALL_MODULES]

    selected_names = [name.strip().lower() for name in checks_str.split(",") if name.strip()]
    resolved: list[SecurityModule] = []

    for name in selected_names:
        if name in MODULE_REGISTRY:
            resolved.append(MODULE_REGISTRY[name]())
        else:
            raise ValueError(
                f"Unknown security check module '{name}'. Available modules: {', '.join(MODULE_REGISTRY.keys())}"
            )

    return resolved
