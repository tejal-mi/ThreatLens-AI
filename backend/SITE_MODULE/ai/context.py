from SITE_MODULE.schema.chat import ChatMessage


def build_chat_messages(
    history: list[ChatMessage],
    prompt: str,
) -> list[dict]:

    messages = []

    for item in history:
        if item.role not in ("user", "assistant"):
            continue

        messages.append({
            "role": "model" if item.role == "assistant" else "user",
            "parts": [
                {
                    "text": str(item.content)
                }
            ],
        })

    messages.append({
        "role": "user",
        "parts": [
            {
                "text": prompt
            }
        ],
    })

    return messages