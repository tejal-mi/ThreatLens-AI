
from tc_auth.db import Base
from sqlalchemy.sql import func
from sqlalchemy import Column, Integer, String, DateTime, JSON


class Attack(Base):
    __tablename__ = "attacks"

    id = Column(Integer, primary_key=True, autoincrement=True)

    account_id = Column(
        Integer,
        nullable=False,
        index=True,
    )

    attack_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    attack_type = Column(
        String,
        nullable=False,
    )

    request = Column(
        JSON,
        nullable=False,
    )

    status = Column(
        JSON,
        nullable=False,
    )

    plot = Column(
        JSON,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )