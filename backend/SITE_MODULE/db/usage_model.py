from sqlalchemy import Column, Integer, BigInteger, String
from tc_auth.db import Base


class Usage(Base):
    __tablename__ = "usage"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    account_id = Column(
        Integer,
        nullable=False,
        unique=True,
        index=True,
    )

    plan = Column(
        String(50),
        nullable=False,
        default="free",
    )

    prompt_tokens = Column(
        BigInteger,
        nullable=False,
        default=0,
    )

    completion_tokens = Column(
        BigInteger,
        nullable=False,
        default=0,
    )
