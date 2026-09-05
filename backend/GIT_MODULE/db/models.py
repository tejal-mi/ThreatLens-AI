from tc_auth.db import Base
from sqlalchemy.dialects.postgresql import JSONB

from sqlalchemy import (
    Column,
    Integer,
    Text,
    func,
    DateTime,
    UniqueConstraint,
)


class Repo(Base):
    __tablename__ = "repositories"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    account_id = Column(
        Integer,
        nullable=False,
        index=True,
    )

    url = Column(
        Text,
        nullable=False,
        unique=True,
    )

    username = Column(
        Text,
        nullable=False,
    )

    name = Column(
        Text,
        nullable=False,
    )

    default_branch = Column(
        Text,
        nullable=False,
    )

    branches = Column(
        JSONB,
        nullable=False,
        default=list,
    )

    remote_branches = Column(
        JSONB,
        nullable=False,
        default=list,
    )

    commit_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    files_total = Column(
        Integer,
        nullable=False,
        default=0,
    )

    files_by_extension = Column(
        JSONB,
        nullable=False,
        default=dict,
    )

    total_size = Column(
        Integer,
        nullable=False,
        default=0,
    )

    largest_files = Column(
        JSONB,
        nullable=False,
        default=list,
    )

    language_files = Column(
        Integer,
        nullable=False,
        default=0,
    )

    languages = Column(
        JSONB,
        nullable=False,
        default=dict,
    )

    tags = Column(
        JSONB,
        nullable=False,
        default=list,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
    )


class Commit(Base):
    __tablename__ = "commits"

    __table_args__ = (
        UniqueConstraint(
            "repo_id",
            "commit_sha",
            name="uq_commit_repo_sha",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    repo_id = Column(
        Integer,
        nullable=False,
        index=True,
    )

    commit_sha = Column(
        Text,
        nullable=False,
        index=True,
    )

    data = Column(
        JSONB,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
    )
    