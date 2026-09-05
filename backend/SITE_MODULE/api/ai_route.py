from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from SITE_MODULE.ai.builder import ai_call, ai_call_stream



class AIChatRequest(BaseModel):
    chat_id: int
    prompt: str
    stream: bool = False


router = APIRouter(
    prefix="/ai",
    tags=["AI CHAT"],
)


@router.post("/chat")
async def ai_chat(
    request: AIChatRequest,
):
    if request.stream:
        return StreamingResponse(
            ai_call_stream(
                chat_id=request.chat_id,
                prompt=request.prompt,
            ),
            media_type="text/plain",
        )

    response = await ai_call(
        chat_id=request.chat_id,
        prompt=request.prompt,
    )

    return {
        "text": response,
    }