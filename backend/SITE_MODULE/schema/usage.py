from pydantic import BaseModel


class UsageUpdateRequest(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    plan: str | None = None