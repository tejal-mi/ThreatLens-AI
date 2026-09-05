import json
from google import genai
from SITE_MODULE.service.chat_service import get_chat_history
from .context import build_chat_messages 
from config import config

from SITE_MODULE.ai.prompt import SYSTEM_PROMPT


client = genai.Client(
    api_key=config.GEMINI_API_KEY
)


async def gemini_call(
    message: list[dict],
) -> dict:

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=message,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "response_mime_type": "application/json",
        },
    )

    return json.loads(response.text)


async def gemini_call_stream(
    message: list[dict],
): 
    response = client.models.generate_content_stream(
        model="gemini-3.5-flash-lite",
        contents=message,
        config={
            "system_instruction": SYSTEM_PROMPT,
            "response_mime_type": "application/json",
        },
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text



async def ai_call(
    chat_id: int,
    prompt: str,
) -> dict:

    history = get_chat_history(
        chat_id=chat_id,
        limit=25,
    )

    message = build_chat_messages(
        history=history,
        prompt=prompt,
    )

    return await gemini_call(message)



async def ai_call_stream(
    chat_id: int,
    prompt: str,
):
    history = get_chat_history(
        chat_id=chat_id,
        limit=25,
    )

    message = build_chat_messages(
        history=history,
        prompt=prompt,
    )

    async for chunk in gemini_call_stream(message):
        yield chunk