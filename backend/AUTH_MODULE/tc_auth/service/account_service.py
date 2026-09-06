from sqlalchemy.exc import IntegrityError
from uuid import UUID

from ..utils.hasher import hash_password
from ..utils.get_helper import to_list_dict
from ..db.models import Account
from ..exceptions.error import (
    EmailAlreadyExistsError,
    HandleAlreadyExistsError,
    PhoneAlreadyExistsError,
    UserNotFoundError,
)



class AccountService:
    def __init__(self, session_factory, get_user):
        self.session_factory = session_factory
        self.get_user = get_user

    # ==========================================================
    # PRIVATE
    # ==========================================================

    _QUERY_FIELDS = {
        "id": Account.id,
        "uid": Account.uid,
        "phone": Account.phone,
        "email": Account.email,
        "name": Account.name,
        "handle": Account.handle,
    }

#===========================Internal Helpers===========================
# GET ACCOUNT BY ID & UserNotFoundError HANDLER

    def _get_account(
        self,
        db,
        account_id: int,
    ):
        account = (
            db.query(Account)
            .filter(Account.id == account_id)
            .first()
        )

        if account is None:
            raise UserNotFoundError("id", account_id)

        return account
    
    
# HANDLE INTEGRITY ERROR & ROLLBACK SESSION

    def _handle_integrity_error(
        self,
        db,
        error: IntegrityError,
    ):
        db.rollback()

        message = str(error.orig)

        if "uq_accounts_email" in message:
            raise EmailAlreadyExistsError()

        if "uq_accounts_handle" in message:
            raise HandleAlreadyExistsError()

        if "uq_accounts_phone" in message:
            raise PhoneAlreadyExistsError()

        raise error
    
#=============================Public Methods===========================
# CREATE USER

    def create_user(
        self,
        name: str | None = None,
        email: str | None = None,
        password: str | None = None,
        handle: str | None = None,
        avatar_url: str | None = None,
        phone: str | None = None,
        role: str | None = None,
        status: str | None = None,
    ):
        with self.session_factory() as db:

            account = Account()

            if name is not None:
                account.name = name

            if email is not None:
                account.email = email

            if password is not None:
                account.password_hash = hash_password(password)

            if handle is not None:
                account.handle = handle

            if avatar_url is not None:
                account.avatar_url = avatar_url

            if phone is not None:
                account.phone = phone

            if role is not None:
                account.role = role

            if status is not None:
                account.status = status

            try:
                db.add(account)
                db.commit()
                db.refresh(account)

            except IntegrityError as e:
                self._handle_integrity_error(db, e)

            return self.get_user.by_id(account.id)


    # UPDATE USER

    def update_user(
        self,
        account_id: int,
        *,
        name: str | None = None,
        email: str | None = None,
        handle: str | None = None,
        avatar_url: str | None = None,
        phone: str | None = None,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)

            if name is not None:
                account.name = name

            if email is not None:
                account.email = email

            if handle is not None:
                account.handle = handle

            if avatar_url is not None:
                account.avatar_url = avatar_url

            if phone is not None:
                account.phone = phone

            try:
                db.commit()
                db.refresh(account)

            except IntegrityError as e:
                self._handle_integrity_error(db, e)

            return self.get_user.by_id(account.id)
        
        
# DELETE ACCOUNT

    def delete_user(
        self,
        account_id: int,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)
            db.delete(account)
            db.commit()


# CHANGE PASSWORD

    def update_password(
        self,
        account_id: int,
        password: str,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)
            account.password_hash = hash_password(password)
            db.commit()


# CHANGE ROLE

    def update_role(
        self,
        account_id: int,
        role: str,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)
            account.role = role
            db.commit()


# CHANGE STATUS

    def update_status(
        self,
        account_id: int,
        status: str | None,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)
            account.status = status
            db.commit()


# SUPER UPDATE USER

    def super_update(
        self,
        account_id: int,
        *,
        name: str | None = None,
        email: str | None = None,
        handle: str | None = None,
        avatar_url: str | None = None,
        phone: str | None = None,
        role: str | None = None,
        status: str | None = None,
        password: str | None = None,
    ):
        with self.session_factory() as db:

            account = self._get_account(db, account_id)

            if name is not None:
                account.name = name

            if email is not None:
                account.email = email

            if handle is not None:
                account.handle = handle

            if avatar_url is not None:
                account.avatar_url = avatar_url

            if phone is not None:
                account.phone = phone

            if role is not None:
                account.role = role

            if status is not None:
                account.status = status

            if password is not None:
                account.password_hash = hash_password(password)

            try:
                db.commit()
                db.refresh(account)

            except IntegrityError as e:
                self._handle_integrity_error(db, e)


    def get_all(self, page: int = 1, limit: int = 10):
        with self.session_factory() as db:
            offset = (page - 1) * limit

            accounts = (
                db.query(Account)
                .order_by(Account.id.desc())
                .offset(offset)
                .limit(limit)
                .all()  
            )

            return to_list_dict(accounts)



    def query(self, field: str, value: str):
        column = self._QUERY_FIELDS.get(field)

        if column is None:
            raise ValueError(f"Invalid query field: {field}")

        with self.session_factory() as db:

            if field == "id":
                try:
                    parsed_value = int(value)
                except ValueError:
                    raise ValueError("id must be an integer")

                accounts = (
                    db.query(Account)
                    .filter(Account.id == parsed_value)
                    .all()
                )

            elif field == "uid":
                try:
                    parsed_value = UUID(value)
                except ValueError:
                    raise ValueError("uid must be a valid UUID")

                accounts = (
                    db.query(Account)
                    .filter(Account.uid == parsed_value)
                    .all()
                )

            else:
                accounts = (
                    db.query(Account)
                    .filter(column.ilike(f"%{value}%"))
                    .all()
                )

            return to_list_dict(accounts)   