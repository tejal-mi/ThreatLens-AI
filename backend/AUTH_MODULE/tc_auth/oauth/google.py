from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from fastapi.responses import RedirectResponse


class GoogleOAuth:
    def __init__(self, oauth_service):
        self.oauth_service = oauth_service
        self.client = None
        self.redirect_uri = None
        self.client_id = None
        self.client_secret = None

    def load(
        self,
        ):
        return {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
        }

    def config(
        self,
        *,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ):
        self.redirect_uri = redirect_uri
        self.client_id = client_id
        self.client_secret = client_secret

        oauth = OAuth()

        self.client = oauth.register(
            name="google",
            client_id=client_id,
            client_secret=client_secret,
            server_metadata_url=(
                "https://accounts.google.com/.well-known/openid-configuration"
            ),
            client_kwargs={
                "scope": "openid email profile",
            },
        )

            
    async def login(
        self,
        request: Request,
        frontend_url: str,
    ):
        request.session["frontend_url"] = frontend_url
        return await self.client.authorize_redirect(
            request,
            self.redirect_uri,
        )


    async def callback(
        self,
        request: Request,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        frontend_url = request.session.get("frontend_url")
        token = await self.client.authorize_access_token(request)
        request.session.pop("frontend_url", None)

        user = token["userinfo"]

        result = self.oauth_service.login(
            provider="google",
            provider_user_id=user["sub"],
            name=user.get("name"),
            email=user.get("email"),
            avatar_url=user.get("picture"),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return RedirectResponse(
            f"{frontend_url}/oauth/callback"
            f"?access_token={result['access_token']}"
        )