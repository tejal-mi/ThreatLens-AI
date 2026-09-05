"""
Abstract base class for sectest security testing modules.
"""

from abc import ABC, abstractmethod
from sectest.core.schema import RawFinding, TargetConfig


class SecurityModule(ABC):
    """Abstract base class that all security modules must implement."""

    name: str = "base"
    description: str = "Base security module"

    @abstractmethod
    async def run(self, target: TargetConfig) -> list[RawFinding]:
        """
        Execute the security audit checks against the specified target.
        Must return a list of RawFinding objects (empty list if no issues found or target unreachable).
        """
        pass
