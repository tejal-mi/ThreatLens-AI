from __future__ import annotations

import shutil
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from urllib.parse import urlparse

from git import Repo
from git.exc import GitCommandError


@dataclass
class CommitInfo:
    sha: str
    short_sha: str

    author_name: str
    author_email: str

    committer_name: str
    committer_email: str

    authored_at: datetime
    committed_at: datetime

    message: str
    parents: list[str]


class Repository:
    """
    Remote public Git repository interface.

    The repository is cloned into a temporary directory when the
    Repository object is created. The temporary repository remains
    available for the lifetime of the object and is deleted when
    close() is called.

    Example:

        repo = Repository(
            "https://github.com/fastapi/fastapi.git"
        )

        print(repo.info_repo())

        commits = repo.list_commits(
            branch="main",
            limit=10,
        )

        commit = repo.info_commit(
            commits[0]["sha"]
        )

        changes = repo.diff(
            commits[0]["sha"]
        )

        repo.close()
    """

    def __init__(self, url: str):
        self.url = self._normalize_url(url)

        self.username, self.repo_name = self._parse_repo_url()

        self.temp_dir: Path | None = None
        self.repo: Repo | None = None

        self._create_repo()

    # ==========================================================
    # INTERNAL
    # ==========================================================

    @staticmethod
    def _normalize_url(url: str) -> str:
        url = url.strip()

        if not url:
            raise ValueError(
                "Repository URL cannot be empty."
            )

        parsed = urlparse(url)

        if parsed.scheme != "https":
            raise ValueError(
                "Only HTTPS repositories are supported."
            )

        if not parsed.netloc:
            raise ValueError(
                "Invalid repository URL."
            )

        return url.rstrip("/")

    def _parse_repo_url(self) -> tuple[str, str]:
        """
        Extract username and repository name.

        Example:

            https://github.com/fastapi/fastapi.git

        becomes:

            username = fastapi
            repo_name = fastapi
        """

        parsed = urlparse(self.url)

        parts = [
            part
            for part in parsed.path.split("/")
            if part
        ]

        if len(parts) < 2:
            raise ValueError(
                "Invalid GitHub repository URL."
            )

        username = parts[-2]
        repo_name = parts[-1]

        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]

        if not username or not repo_name:
            raise ValueError(
                "Could not determine repository owner or name."
            )

        return username, repo_name

    def _create_repo(self) -> None:
        """
        Clone the repository once into a temporary directory.
        """

        # Example:
        #
        # %TEMP%/
        #   trustgit-fastapi-fastapi-a81f92c3/
        #

        repo_identifier = (
            f"trustgit-{self.username}-{self.repo_name}-"
            f"{uuid4().hex[:8]}"
        )

        self.temp_dir = Path(
            tempfile.gettempdir()
        ) / repo_identifier

        repo_path = self.temp_dir / "repo"

        try:
            self.temp_dir.mkdir(
                parents=True,
                exist_ok=False,
            )

            self.repo = Repo.clone_from(
                self.url,
                repo_path,
            )

        except Exception:
            self.close()
            raise

    def _ensure_open(self) -> Repo:
        """
        Ensure the repository has not been closed.
        """

        if self.repo is None:
            raise RuntimeError(
                "Repository is closed."
            )

        return self.repo

    @staticmethod
    def _get_default_branch(repo: Repo) -> str:
        """
        Determine the remote's default branch.
        """

        try:
            remote = repo.remote("origin")

            # origin/HEAD -> origin/main
            symbolic = remote.refs.HEAD

            return symbolic.reference.name.split("/")[-1]

        except Exception:
            pass

        try:
            return repo.active_branch.name

        except Exception as exc:
            raise RuntimeError(
                "Could not determine repository default branch."
            ) from exc

    @staticmethod
    def _resolve_commit(
        repo: Repo,
        sha: str,
    ):
        if not sha or not sha.strip():
            raise ValueError(
                "Commit SHA cannot be empty."
            )

        try:
            return repo.commit(sha)

        except Exception as exc:
            raise ValueError(
                f"Commit not found: {sha}"
            ) from exc

    @staticmethod
    def _commit_to_info(commit) -> CommitInfo:
        return CommitInfo(
            sha=commit.hexsha,
            short_sha=commit.hexsha[:7],

            author_name=commit.author.name,
            author_email=commit.author.email,

            committer_name=commit.committer.name,
            committer_email=commit.committer.email,

            authored_at=commit.authored_datetime,
            committed_at=commit.committed_datetime,

            message=commit.message.strip(),

            parents=[
                parent.hexsha
                for parent in commit.parents
            ],
        )

    # ==========================================================
    # REPOSITORY INFO
    # ==========================================================

    def info_repo(self) -> dict:
        """
        Return metadata about the repository.
        """

        repo = self._ensure_open()

        default_branch = self._get_default_branch(repo)

        branches = [
            branch.name
            for branch in repo.branches
        ]

        remote_branches = []

        for ref in repo.remotes.origin.refs:
            if ref.name == "origin/HEAD":
                continue

            remote_branches.append(
                ref.name.removeprefix("origin/")
            )

        commit_count = sum(
            1
            for _ in repo.iter_commits("--all")
        )

        return {
            "url": self.url,

            "username": self.username,
            "name": self.repo_name,

            "default_branch": default_branch,

            "branches": branches,
            "remote_branches": remote_branches,

            "commit_count": commit_count,
        }

    # ==========================================================
    # LIST COMMITS
    # ==========================================================

    def list_commits(
        self,
        branch: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        """
        List commits from a branch.

        Args:
            branch:
                Branch to inspect.
                If None, the repository default branch is used.

            limit:
                Maximum number of commits.
                If None, all commits are returned.
        """

        if limit is not None and limit <= 0:
            raise ValueError(
                "limit must be greater than 0."
            )

        repo = self._ensure_open()

        if branch is None:
            branch = self._get_default_branch(repo)

        try:
            commits = repo.iter_commits(
                branch,
                max_count=limit,
            )

        except GitCommandError as exc:
            raise ValueError(
                f"Branch not found: {branch}"
            ) from exc

        return [
            asdict(
                self._commit_to_info(commit)
            )
            for commit in commits
        ]

    # ==========================================================
    # COMMIT INFO
    # ==========================================================

    def info_commit(
        self,
        sha: str,
    ) -> dict:
        """
        Return detailed metadata for a commit.
        """

        repo = self._ensure_open()

        commit = self._resolve_commit(
            repo,
            sha,
        )

        return asdict(
            self._commit_to_info(commit)
        )

    # ==========================================================
    # DIFF
    # ==========================================================

    def diff(
        self,
        sha: str,
    ) -> list[dict]:
        """
        Return file-level changes introduced by a commit.

        For a normal commit:
            parent -> commit

        For a merge commit:
            first parent -> commit

        For the root commit:
            empty tree -> commit
        """

        repo = self._ensure_open()

        commit = self._resolve_commit(
            repo,
            sha,
        )

        # ------------------------------------------------------
        # Normal / merge commit
        # ------------------------------------------------------

        if commit.parents:

            parent = commit.parents[0]

            diffs = parent.diff(
                commit,
                create_patch=True,
            )

        # ------------------------------------------------------
        # Root commit
        # ------------------------------------------------------

        else:

            empty_tree_sha = (
                "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
            )

            empty_tree = repo.tree(
                empty_tree_sha
            )

            diffs = empty_tree.diff(
                commit,
                create_patch=True,
            )

        result = []

        for item in diffs:

            patch = item.diff

            if isinstance(patch, bytes):
                patch = patch.decode(
                    "utf-8",
                    errors="replace",
                )

            result.append(
                {
                    "change_type": item.change_type,

                    "old_path": item.a_path,
                    "new_path": item.b_path,

                    "old_mode": (
                        str(item.a_mode)
                        if item.a_mode
                        else None
                    ),

                    "new_mode": (
                        str(item.b_mode)
                        if item.b_mode
                        else None
                    ),

                    "diff": patch,
                }
            )

        return result

    # ==========================================================
    # CLOSE
    # ==========================================================

    def close(self) -> None:
        """
        Close the repository and delete its temporary files.
        """

        if self.repo is not None:

            try:
                self.repo.close()

            except Exception:
                pass

            self.repo = None

        if self.temp_dir is not None:

            shutil.rmtree(
                self.temp_dir,
                ignore_errors=True,
            )

            self.temp_dir = None

    # ==========================================================
    # CONTEXT MANAGER
    # ==========================================================

    def __enter__(self) -> Repository:
        return self

    def __exit__(
        self,
        exc_type,
        exc_value,
        traceback,
    ):
        self.close()