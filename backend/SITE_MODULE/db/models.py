from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from tc_auth.db import Base


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    message = Column(
        JSONB,
        nullable=False,
    )

    chat_id = Column(
        Integer,
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )



class Chat(Base):
    __tablename__ = "chats"

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

    title = Column(
        String,
        nullable=True,
    )

    model = Column(
        String,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )