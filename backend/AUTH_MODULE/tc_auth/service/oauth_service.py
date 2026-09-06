from ..db.models import OAuthAccount
from ..utils.get_helper import to_list_dict, to_dict


class OAuthService:
    def __init__(
        self,
        get_user,
        session_factory,
        account,
        auth_service,
    ):
        self.get_user = get_user
        self.session_factory = session_factory
        self.account = account
        self.auth_service = auth_service


    # ==========================================================
    # LOGIN
    # ==========================================================

    def login(
        self,
        *,
        provider: str,
        provider_user_id: str,
        name: str | None = None,
        email: str | None = None,
        avatar_url: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        oauth = self.find_oauth(
            provider=provider,
            provider_user_id=provider_user_id,
        )

        if oauth is not None:
            account = self.get_user.by_id(oauth.account_id)

        else:
            account = self._find_or_create_account(
                provider=provider,
                provider_user_id=provider_user_id,
                name=name,
                email=email,
                avatar_url=avatar_url,
            )

        result = self.auth_service.create_login_response(
            account=account,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return result

    # ==========================================================
    # PRIVATE
    # ==========================================================
    _QUERY_FIELDS = {
        "id": OAuthAccount.id,
        "provider_id": OAuthAccount.provider_user_id,
        "account_id": OAuthAccount.account_id,
    }

    def _find_or_create_account(
        self,
        *,
        provider: str,
        provider_user_id: str,
        name: str | None,
        email: str | None,
        avatar_url: str | None,
    ):
        account = None

        if email is not None:
            account = self.get_user.find_by_email(email)

        if account is None:
            account = self.account.create_user(
                name=name,
                email=email,
                avatar_url=avatar_url,
            )

        else:
            self._initialize_profile(
                account=account,
                name=name,
                email=email,
                avatar_url=avatar_url,
            )

        self.link_account(
            account_id=account["id"],
            provider=provider,
            provider_user_id=provider_user_id,
        )

        return account

    def _initialize_profile(
        self,
        *,
        account: dict,
        name: str | None,
        email: str | None,
        avatar_url: str | None,
    ):
        updates = {}

        if account["name"] is None and name is not None:
            updates["name"] = name

        if account["email"] is None and email is not None:
            updates["email"] = email

        if account["avatar_url"] is None and avatar_url is not None:
            updates["avatar_url"] = avatar_url

        if updates:
            self.account.update_user(
                account["id"],
                **updates,
            )

    # ==========================================================
    # OAUTH LINKS
    # ==========================================================

    def find_oauth(
        self,
        *,
        provider: str,
        provider_user_id: str,
    ):
        with self.session_factory() as db:
            return (
                db.query(OAuthAccount)
                .filter_by(
                    provider=provider,
                    provider_user_id=provider_user_id,
                )
                .first()
            )
        

    def link_account(
        self,
        *,
        account_id: int,
        provider: str,
        provider_user_id: str,
    ):
        with self.session_factory() as db:
            oauth = OAuthAccount(
                account_id=account_id,
                provider=provider,
                provider_user_id=provider_user_id,
            )

            db.add(oauth)
            db.commit()
            db.refresh(oauth)

            return to_dict(oauth)


    def unlink_account(
        self,
        *,
        account_id: int,
        provider: str,
    ):
        with self.session_factory() as db:
            (
                db.query(OAuthAccount)
                .filter_by(
                    account_id=account_id,
                    provider=provider,
                )
                .delete()
            )

            db.commit()


    def get_all(self, page: int = 1, limit: int = 10):
        with self.session_factory() as db:
            offset = (page - 1) * limit

            oauth_links = (
                db.query(OAuthAccount)
                .order_by(OAuthAccount.id.desc())
                .offset(offset)
                .limit(limit)
                .all()  
            )

            return to_list_dict(oauth_links)



    def query(self, field: str, value: str):
        column = self._QUERY_FIELDS.get(field)

        if column is None:
            raise ValueError(f"Invalid query field: {field}")

        if field in ["id","account_id"]:
            try:
                value = int(value)
            except ValueError:
                raise ValueError("id must be an integer")

        with self.session_factory() as db:
            oauth_records = (
                db.query(OAuthAccount)
                .filter(column == value)
                .all()
            )

            return to_list_dict(oauth_records)