
from fastapi import FastAPI
from sqlalchemy import Engine 

from starlette.middleware.sessions import SessionMiddleware
from . import jwt_handler

from .db import (
    Base,
    create_session_factory,
)

from .email import EmailService
from .exceptions import (
    AuthError,
    auth_exception_handler,
)

from .oauth import (
    GoogleOAuth,
    GitHubOAuth,
)

from .service import (
    OTPService,
    AuthService,
    OAuthService,
    SessionService,
    AccountService,
    GetUserService,
    DashboardService,
)

from .dependencies import (
    AuthDeps,
    RoleDeps,
    StatusDeps,
)

from .api import (
    AuthRoutes,
    OAuthRoutes,
    AccountRoutes,
    DashboardRoute,
    DashOTPRoutes,
    DashOAuthRoutes,
    DashAccountRoutes,
    DashSessionRoutes,
)

class Auth:
    def __init__(self, engine: Engine , app: FastAPI):
        self.engine = engine
        self.app = app
        self.session_factory = create_session_factory(engine)
        
        self.get_user = GetUserService(session_factory=self.session_factory)
        self.account = AccountService(session_factory=self.session_factory, get_user=self.get_user)
        self.session = SessionService(session_factory=self.session_factory)
        self.service = AuthService(get_user=self.get_user, account=self.account, session=self.session)
        self.otp = OTPService(session_factory=self.session_factory)
        self.dashboard = DashboardService(session_factory=self.session_factory)

        self.oauth = OAuthService(get_user=self.get_user, session_factory=self.session_factory, account=self.account, auth_service=self.service)
        self.google = GoogleOAuth(oauth_service=self.oauth)
        self.github = GitHubOAuth(oauth_service=self.oauth)
        
        self.deps = AuthDeps(get_user=self.get_user, session=self.session)
        self.role = RoleDeps(auth_deps=self.deps)
        self.status = StatusDeps(auth_deps=self.deps)

        self.jwt = jwt_handler
        self.email = EmailService(otp_service=self.otp)

        self.oauth_routes = OAuthRoutes(app=self.app, google=self.google, github=self.github)
        self.account_routes = AccountRoutes(app=self.app, session_service=self.session, account_service=self.account, deps=self.deps)
        self.auth_routes = AuthRoutes(app=self.app, email_service=self.email, auth_service=self.service , otp_service=self.otp, get_user=self.get_user)

        self.dash_otp_routes = DashOTPRoutes(app=self.app, otp_service=self.otp, role_deps=self.role)
        self.dash_oauth_routes = DashOAuthRoutes(app=self.app, oauth_service=self.oauth, role_deps=self.role)
        self.dash_session_routes = DashSessionRoutes(app=self.app, session_service=self.session, role_deps=self.role)
        self.dash_account_routes = DashAccountRoutes(app=self.app, account_service=self.account, role_deps=self.role)
        self.dashboard_routes = DashboardRoute(app=self.app, email_service=self.email, github_service=self.github, google_service=self.google, jwt_service=self.jwt, role_deps=self.role, dashboard_service=self.dashboard)
        
        self.app.add_exception_handler(AuthError,auth_exception_handler,)
        self.app.add_exception_handler(AuthError,auth_exception_handler,)
        self.app.add_middleware(SessionMiddleware, secret_key="session-secret-key")

    

    def init(self):
        Base.metadata.create_all(bind=self.engine)

    def destroy(self):
        Base.metadata.drop_all(bind=self.engine)

