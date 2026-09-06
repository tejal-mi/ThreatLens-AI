from datetime import UTC, datetime

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..exceptions.error import InvalidTokenError
from ..jwt_handler import verify_token
from ..utils.hasher import verify_hash

security_jwt = HTTPBearer()


class AuthDeps:
    def __init__(self, get_user, session):
        self.get_user = get_user
        self.session = session

    # ==========================================================
    # PRIVATE
    # ==========================================================

    def _authenticate(
        self,
        token: str,
    ):
        payload = verify_token(token)

        session = self.session.by_id(
            payload["sid"]
        )

        if session is None:
            raise InvalidTokenError(field="session")

        if session["account_id"] != payload["aid"]:
            raise InvalidTokenError(field="account_id")

        expires_at = datetime.fromisoformat(
            session["expires_at"]
        )

        if expires_at < datetime.now():
            raise InvalidTokenError(field="session")

        if not verify_hash(
            payload["token"],
            session["token_hash"],
        ):
            raise InvalidTokenError(field="token")

        return payload, session

    # ==========================================================
    # CURRENT
    # ==========================================================

    def get_current(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security_jwt),
    ):
        payload, session = self._authenticate(
            credentials.credentials
        )

        account = self.get_user.by_id(
            payload["aid"]
        )

        return {
            "account": account,
            "session": session,
            "payload": payload,
        }

    # ==========================================================
    # HELPERS
    # ==========================================================

    def get_current_account(
        self,
        current=Depends(get_current),
    ):
        return current["account"]

    def get_current_session(
        self,
        current=Depends(get_current),
    ):
        return current["session"]

    def get_current_payload(
        self,
        current=Depends(get_current),
    ):
        return current["payload"]