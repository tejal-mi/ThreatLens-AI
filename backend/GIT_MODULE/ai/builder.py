import json

from google import genai

from config import config
from GIT_MODULE.ai.context import build_commit_ai_prompt
from GIT_MODULE.ai.prompt import SYSTEM_PROMPT


client = genai.Client(
    api_key=config.GEMINI_API_KEY
)


async def gemini_call(
    message: str,
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
    message: str,
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
    diffs: list[dict],
    raw_analysis: dict,
) -> dict:

    message = build_commit_ai_prompt(
        diffs=diffs,
        data=raw_analysis,
        max_diff_chars=10_000,
    )

    return await gemini_call(message)


async def ai_call_stream(
    diffs: list[dict],
    raw_analysis: dict,
):
    message = build_commit_ai_prompt(
        diffs=diffs,
        data=raw_analysis,
        max_diff_chars=10_000,
    )

    yield json.dumps({
        "type": "diff",
        "data": diffs,
    }) + "\n"

    async for chunk in gemini_call_stream(message):
        yield json.dumps({
            "type": "response",
            "data": chunk,
        }) + "\n"

