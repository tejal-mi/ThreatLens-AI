from pydantic import BaseModel
from typing import Any


class AttackCreate(BaseModel):
    attack_id: str
    attack_type: str
    request: dict[str, Any]
    status: dict[str, Any]
    plot: dict[str, Any] | None = None