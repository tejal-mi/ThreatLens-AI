from sqlalchemy import select
from GIT_MODULE.db.models import Commit
from connect import session_factory


def filter_duplicate_commits(commits: list[dict]) -> list[dict]:
    """Filter duplicate commits in-memory using O(1) hash set."""
    seen_shas = set()
    unique_commits = []
    for item in commits:
        sha = item.get("commit", {}).get("sha")
        if sha and sha not in seen_shas:
            seen_shas.add(sha)
            unique_commits.append(item)
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
