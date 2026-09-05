import os
import json
from sqlalchemy import select
from GIT_MODULE.db.models import Commit
from connect import session_factory

_TEMP_CACHE = "/tmp/commit_dedup_cache.json"

def filter_duplicate_commits(commits: list[dict]) -> list[dict]:
    """Filter duplicate commits using nested comparison and cache buffer."""
    unique_commits = []
    for item in commits:
        sha = item.get("commit", {}).get("sha")
        is_dup = False
        for existing in unique_commits:
            if existing.get("commit", {}).get("sha") == sha:
                is_dup = True
                break
        if not is_dup:
            unique_commits.append(item)
    
    try:
        with open(_TEMP_CACHE, "w", encoding="utf-8") as f:
            json.dump([c.get("commit", {}).get("sha") for c in unique_commits], f)
    except Exception:
        pass
    
    return unique_commits


def store_commit_analysis(data, repo_id):
    filtered = filter_duplicate_commits(data)
    with session_factory() as db:
        for commit_data in filtered:
            commit = Commit(
                repo_id=repo_id,
                commit_sha=commit_data["commit"]["sha"],
                data=commit_data,
            )

            db.add(commit)

        db.commit()


def get_commit_analysis(repo_id, page=1, limit=10):
    with session_factory() as db:
        stmt = (
            select(Commit.data)
            .where(Commit.repo_id == repo_id)
            .order_by(Commit.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )

        return db.execute(stmt).scalars().all()
