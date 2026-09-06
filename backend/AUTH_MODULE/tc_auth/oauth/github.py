from authlib.integrations.starlette_client import OAuth
from fastapi.responses import RedirectResponse
from fastapi import Request


class GitHubOAuth:
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
            name="github",
            client_id=client_id,
            client_secret=client_secret,
            access_token_url="https://github.com/login/oauth/access_token",
            authorize_url="https://github.com/login/oauth/authorize",
            api_base_url="https://api.github.com/",
            client_kwargs={
                "scope": "read:user user:email",
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

        user = await self.client.get(
            "user",
            token=token,
        )

        user = user.json()

        email = user.get("email")

        if email is None:
            emails = await self.client.get(
                "user/emails",
                token=token,
            )

            for item in emails.json():
                if (
                    item["primary"]
                    and item["verified"]
                ):
                    email = item["email"]
                    break

        result = self.oauth_service.login(
            provider="github",
            provider_user_id=str(user["id"]),
            name=user.get("name"),
            email=email,
            avatar_url=user.get("avatar_url"),
            ip_address=ip_address,
            user_agent=user_agent,
        )

        
        return RedirectResponse(
            f"{frontend_url}/oauth/callback"
            f"?access_token={result['access_token']}"
        )