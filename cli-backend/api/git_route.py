
from fastapi import APIRouter
from pydantic import BaseModel
from service.repo_service import save_commits

router = APIRouter(prefix="/git", tags=["Git"])

class RepoRequest(BaseModel):
    url: str


@router.patch("/build")
def analyze_repo(data: RepoRequest):
    return save_commits(data.url)