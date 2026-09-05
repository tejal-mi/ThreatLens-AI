from typing import Any
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: Any = None
    tool_calls: list[dict] | None = None
    tool_call_id: str | None = None


class SaveChatHistoryRequest(BaseModel):
    chat_id: int
    messages: list[ChatMessage]


class SaveChatHistoryResponse(BaseModel):
    chat_id: int
    saved: int



class CreateChatRequest(BaseModel):
    title: str | None = None
    model: str | None = None


class DeleteChatResponse(BaseModel):
    success: bool