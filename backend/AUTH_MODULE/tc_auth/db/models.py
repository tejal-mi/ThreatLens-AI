import uuid

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    TIMESTAMP,
    func,
    Index,
 
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey, UniqueConstraint
from ..db.base import Base

# ============================= ACCOUNT =============================

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)

    uid = Column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True,
    )

    name = Column(String(100), nullable=True)
    handle = Column(
        String(30),
        nullable=True,
        index=True,
    )

    email = Column(
        String(255),
        nullable=True,
        index=True,
    )

    phone = Column(
        String(20),
        nullable=True,
        index=True,
    )

    password_hash = Column(
        Text,
        nullable=True,
    )

    avatar_url = Column(
        Text,
        nullable=True,
    )

    role = Column(
        String(50),
        server_default="user",
        nullable=False,
    )

    status = Column(
        String(100),
        nullable=True,
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    oauth_accounts = relationship(
        "OAuthAccount",
        back_populates="account",
        cascade="all, delete-orphan",
    )

    sessions = relationship(
        "Session",
        back_populates="account",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "email",
            name="uq_accounts_email",
        ),
        UniqueConstraint(
            "handle",
            name="uq_accounts_handle",
        ),
        UniqueConstraint(
            "phone",
            name="uq_accounts_phone",
        ),
    )


# ========================== OAUTH ACCOUNT ==========================

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    account_id = Column(
        Integer,
        ForeignKey(
            "accounts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    provider = Column(
        String(30),
        nullable=False,
        index=True,
    )

    provider_user_id = Column(
        String(255),
        nullable=False,
        index=True,
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )

    account = relationship(
        "Account",
        back_populates="oauth_accounts",
    )

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_oauth_provider_user",
        ),
        UniqueConstraint(
            "account_id",
            "provider",
            name="uq_account_provider",
        ),
    )

    
#=============================SESSION=============================

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)

    account_id = Column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    token_hash = Column(Text, nullable=False, unique=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    expires_at = Column(TIMESTAMP, nullable=False)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )

    account = relationship(
        "Account",
        back_populates="sessions",
    )



#=============================OTP=============================

class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, autoincrement=True)

    identifier = Column(
        String(255),
        nullable=False,
        index=True,
    )

    purpose = Column(
        String(100),
        nullable=False,
    )

    code_hash = Column(
        Text,
        nullable=False,
    )

    attempts = Column(
        Integer,
        default=0,
        nullable=False,
    )

    expires_at = Column(
        TIMESTAMP,
        nullable=False,
    )

    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "idx_otp_identifier_purpose",
            "identifier",
            "purpose",
        ),
    )