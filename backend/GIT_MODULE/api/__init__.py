from fastapi import APIRouter

from .repo_route import router as repo_router

git_router = APIRouter()
git_router.include_router(repo_router)

