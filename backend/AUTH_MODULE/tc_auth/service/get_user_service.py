from ..db.models import Account
from ..utils.get_helper import to_dict
from ..exceptions.error import UserNotFoundError
from uuid import UUID




class GetUserService:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    # ==========================================================
    # PRIVATE
    # ==========================================================


    _QUERY_FIELDS = {
        "id": Account.id,
        "uid": Account.uid,
        "phone": Account.phone,
        "email": Account.email,
        "handle": Account.handle,
    }

    def _get_by(
        self,
        column,
        value,
        include_password: bool = False,
    ):
        with self.session_factory() as db:
            account = (
                db.query(Account)
                .filter(column == value)
                .first()
            )

            if account is None:
                raise UserNotFoundError(field=column.key, value=value)

            exclude = [] if include_password else ["password_hash"]
            return to_dict(account, exclude=exclude)
        

    # ==========================================================
    # PUBLIC
    # ==========================================================

    def by_id(
        self,
        account_id: int,
        include_password: bool = False,
    ):
        return self._get_by(
            Account.id,
            account_id,
            include_password,
        )

    def by_uid(
        self,
        uid: str,
        include_password: bool = False,
    ):
        return self._get_by(
            Account.uid,
            uid,
            include_password,
        )

    def by_email(
        self,
        email: str,
        include_password: bool = False,
    ):
        return self._get_by(
            Account.email,
            email,
            include_password,
        )

    def by_handle(
        self,
        handle: str,
        include_password: bool = False,
    ):
        return self._get_by(
            Account.handle,
            handle,
            include_password,
        )

    def by_phone(
        self,
        phone: str,
        include_password: bool = False,
    ):
        return self._get_by(
            Account.phone,
            phone,
            include_password,
        )
    
    
    def find_by_email(
        self,
        email: str,
        include_password: bool = False,
    ):
        with self.session_factory() as db:

            account = (
                db.query(Account)
                .filter(Account.email == email)
                .first()
            )

            if account is None:
                return None
            
            exclude = [] if include_password else ["password_hash"]
            return to_dict(account, exclude=exclude)
            