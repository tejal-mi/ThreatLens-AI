from typing import Any
from pydantic import BaseModel

class RepositoryUpsertRequest(BaseModel):
    data: dict[str, Any]

class RepositoryUpsertResponse(BaseModel):
    status: str
    repo_id: int

class RepositoryResponse(BaseModel):
    id: int
    account_id: int
    url: str
    username: str
    name: str
    default_branch: str
    branches: list[str]
    remote_branches: list[str]
    commit_count: int
    files_total: int
    files_by_extension: dict[str, int]
    total_size: int
    largest_files: list[dict[str, Any]]
    language_files: int
    languages: dict[str, int]
    tags: list[Any]
    created_at: str
    updated_at: str

class CommitAnalysisRequest(BaseModel):
    data: list[dict[str, Any]]


class CommitAnalysisResponse(BaseModel):
    status: str
    count: int


class CommitAnalysisItem(BaseModel):
    commit: dict[str, Any]
    summary: dict[str, Any]
    findings: list[dict[str, Any]]


class CommitAnalysisListResponse(BaseModel):
    page: int
    limit: int
    data: list[CommitAnalysisItem]

class AICommitAnalysisRequest(BaseModel):
    url: str
    analysis: dict 
    stream : bool = False