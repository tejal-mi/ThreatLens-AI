from fastapi import APIRouter

from .chat_route import router as chat_router
from .usage_route import router as usage_router
from .ai_route import router as ai_router
from .attack_route import router as attack_router



site_router = APIRouter()
site_router.include_router(chat_router)
site_router.include_router(usage_router)
site_router.include_router(ai_router)
site_router.include_router(attack_router)
