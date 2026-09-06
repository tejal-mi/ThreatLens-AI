# TC-Auth FastAPI Setup

This guide shows how to initialize `tc-auth` in a FastAPI application
and configure its database, CORS, email, OAuth, and JWT services.

------------------------------------------------------------------------

# 1. Imports

``` python
from tc_auth import Auth
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
```

You can also import all available modules and dependencies with:

``` python
from tc_auth import *
```

This can provide components such as `Auth`, `FastAPI`, `CORSMiddleware`,
`create_engine`, and other exported modules.

------------------------------------------------------------------------

# 2. Create the FastAPI Application

``` python
app = FastAPI()
```

This creates the FastAPI application that will be used by `tc-auth`.

------------------------------------------------------------------------

# 3. Configure the Database

Create a SQLAlchemy engine for the database used by `tc-auth`.

``` python
engine = create_engine(
    "postgresql://workspace:admin@localhost:5432/tc_auth"
)
```

Replace the database URL with your own database credentials and database
name.

------------------------------------------------------------------------

# 4. Initialize `Auth`

Create the main `Auth` instance by passing the database engine and
FastAPI application.

``` python
auth = Auth(
    engine=engine,
    app=app,
)
```

The `auth` object provides access to the tc-auth services, including:

``` text
auth.account
auth.oauth
auth.session
auth.otp
auth.email
auth.jwt
auth.deps
auth.roles
auth.status
auth.google
auth.github
auth.dashboard
```

------------------------------------------------------------------------

# 5. Configure CORS

CORS should be configured when using the tc-auth dashboard.

Without the correct CORS configuration, the dashboard frontend may not
be able to communicate with the authentication API.

``` python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.totalchaos.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Dashboard Origin

The dashboard frontend must be allowed to access the API.

Example:

``` text
https://app.totalchaos.online
```

> **Production:** Prefer specifying trusted frontend origins instead of
> using `allow_origins=["*"]`.

------------------------------------------------------------------------

# 6. Configure Email

Configure the SMTP service used by tc-auth for normal emails and OTP
emails.

Example using Gmail SMTP:

``` python
auth.email.config(
    host="smtp.gmail.com",
    port=587,
    username="your-email@gmail.com",
    password="your-app-password",
    sender="your-email@gmail.com",
    sender_name="Total Chaos",
    use_tls=True,
)
```

## Parameters

  Parameter       Description
  --------------- ---------------------------------------
  `host`          SMTP server hostname.
  `port`          SMTP server port.
  `username`      SMTP authentication username.
  `password`      SMTP authentication password.
  `sender`        Sender email address.
  `sender_name`   Optional sender display name.
  `use_tls`       Enables STARTTLS. Defaults to `True`.

### Security

Do not hard-code SMTP passwords in production.

Use environment variables or a secure secret-management system.

------------------------------------------------------------------------

# 7. Configure Google OAuth

Configure Google OAuth authentication using the Google OAuth credentials
created for your application.

Google Cloud credentials:

`https://console.cloud.google.com/apis/credentials`

``` python
auth.google.config(
    client_id="your-google-client-id",
    client_secret="your-google-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/google/callback"
    ),
)
```

## Parameters

  Parameter         Description
  ----------------- -----------------------------
  `client_id`       Google OAuth client ID.
  `client_secret`   Google OAuth client secret.
  `redirect_uri`    Google OAuth callback URL.

The `redirect_uri` must exactly match the callback URL registered with
Google.

------------------------------------------------------------------------

# 8. Configure GitHub OAuth

Create a GitHub OAuth App and obtain its Client ID and Client Secret.

Then configure it:

``` python
auth.github.config(
    client_id="your-github-client-id",
    client_secret="your-github-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/github/callback"
    ),
)
```

## Parameters

  Parameter         Description
  ----------------- -----------------------------
  `client_id`       GitHub OAuth client ID.
  `client_secret`   GitHub OAuth client secret.
  `redirect_uri`    GitHub OAuth callback URL.

The callback URL configured in GitHub must exactly match the
`redirect_uri` used by the application.

------------------------------------------------------------------------

# 9. Configure JWT

JWT configuration is optional.

`tc-auth` provides default JWT configuration, so you do not need to call
`auth.jwt.config()` unless you want to customize it.

Example custom configuration:

``` python
auth.jwt.config(
    secret_key="your-super-secret-key",
    algorithm="HS256",
    session_duration_days=7,
)
```

## Parameters

  Parameter                 Description
  ------------------------- ----------------------------------------
  `secret_key`              Secret used to sign and verify JWTs.
  `algorithm`               JWT signing algorithm.
  `session_duration_days`   Token/session validity period in days.

## Default Configuration

If `auth.jwt.config()` is not called, the library uses its built-in
default JWT configuration.

## Security

Use a strong, randomly generated secret key in production.

Never commit the JWT secret key to Git.

------------------------------------------------------------------------

# 10. Run the Application

Use Uvicorn to start the FastAPI application.

``` python
def run():
    import uvicorn

    uvicorn.run(
        "connect:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
```

Then use the Python entry point:

``` python
if __name__ == "__main__":
    run()
```

Run the application with:

``` bash
python connect.py
```

The application will listen on:

``` text
http://0.0.0.0:8000
```

------------------------------------------------------------------------

# Complete Setup

``` python
from tc_auth import Auth
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine


# ==========================================================
# APPLICATION
# ==========================================================

app = FastAPI()


# ==========================================================
# DATABASE
# ==========================================================

engine = create_engine(
    "postgresql://workspace:admin@localhost:5432/tc_auth"
)


# ==========================================================
# TC-AUTH
# ==========================================================

auth = Auth(
    engine=engine,
    app=app,
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.totalchaos.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# EMAIL
# ==========================================================

auth.email.config(
    host="smtp.gmail.com",
    port=587,
    username="your-email@gmail.com",
    password="your-app-password",
    sender="your-email@gmail.com",
    sender_name="Total Chaos",
    use_tls=True,
)


# ==========================================================
# GOOGLE OAUTH
# ==========================================================

auth.google.config(
    client_id="your-google-client-id",
    client_secret="your-google-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/google/callback"
    ),
)


# ==========================================================
# GITHUB OAUTH
# ==========================================================

auth.github.config(
    client_id="your-github-client-id",
    client_secret="your-github-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/github/callback"
    ),
)


# ==========================================================
# JWT
# ==========================================================
#
# Optional. Remove this section if the default JWT
# configuration is sufficient.

auth.jwt.config(
    secret_key="your-super-secret-key",
    algorithm="HS256",
    session_duration_days=7,
)


# ==========================================================
# SERVER
# ==========================================================

def run():
    import uvicorn

    uvicorn.run(
        "connect:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    run()
```

------------------------------------------------------------------------

# Configuration Checklist

Before running the application, verify:

-   [ ] Database URL is correct.
-   [ ] `Auth` is initialized with the database engine and FastAPI app.
-   [ ] Dashboard frontend origin is allowed by CORS.
-   [ ] SMTP credentials are configured if email/OTP features are used.
-   [ ] Google OAuth credentials are configured if Google login is used.
-   [ ] GitHub OAuth credentials are configured if GitHub login is used.
-   [ ] OAuth callback URLs exactly match the provider configuration.
-   [ ] JWT secret is configured securely if custom JWT settings are
    used.
-   [ ] Secrets are not committed to Git.
