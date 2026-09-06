# ==========================================================
# TC-AUTH APPLICATION SETUP
# ==========================================================
#
# This file demonstrates the recommended setup for using
# tc-auth with a FastAPI application.
#
# The setup includes:
#
#     1. FastAPI application
#     2. Database engine
#     3. Auth instance
#     4. CORS configuration
#     5. Email configuration
#     6. Google OAuth configuration
#     7. GitHub OAuth configuration
#     8. JWT configuration
#     9. Uvicorn server
#
#
# ==========================================================
# IMPORT TC-AUTH
# ==========================================================

from tc_auth import Auth
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine


# ==========================================================
# IMPORT ALL TC-AUTH MODULES
# ==========================================================
#
# Instead of importing individual components:
#
#     from tc_auth import Auth
#
# You can also use:
#
#     from tc_auth import *
#
# This imports the available tc-auth components such as
# Auth, FastAPI, CORSMiddleware, create_engine, etc.
#
#
# ==========================================================
# CREATE FASTAPI APPLICATION
# ==========================================================

app = FastAPI()


# ==========================================================
# DATABASE ENGINE
# ==========================================================
#
# Create the SQLAlchemy database engine used by tc-auth.
#
# Replace the connection URL with your own database
# configuration.
#
engine = create_engine(
    "postgresql://workspace:admin@localhost:5432/tc_auth"
)


# ==========================================================
# INITIALIZE TC-AUTH
# ==========================================================
#
# Create the main Auth instance.
#
# Parameters:
#
#     engine:
#         SQLAlchemy database engine.
#
#     app:
#         FastAPI application.
#
# The Auth instance exposes the tc-auth services:
#
#     auth.account
#     auth.oauth
#     auth.session
#     auth.otp
#     auth.email
#     auth.jwt
#     auth.deps
#     auth.roles
#     auth.status
#     auth.google
#     auth.github
#     auth.dashboard
#     ...
#
auth = Auth(
    engine=engine,
    app=app,
)


# ==========================================================
# CORS CONFIGURATION
# ==========================================================
#
# It is recommended to configure CORSMiddleware when using
# the tc-auth dashboard.
#
# Without appropriate CORS configuration, the frontend
# dashboard may not be able to communicate with the
# authentication API.
#
# The dashboard origin must be allowed to access the API.
#
# Example dashboard:
#
#     https://app.totalchaos.online
#
# IMPORTANT:
#
# For production, prefer specifying your actual frontend
# origins instead of allowing every origin with "*".
#
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
# EMAIL SERVICE CONFIGURATION
# ==========================================================
#
# Configure the SMTP server used by tc-auth for sending
# emails and OTP messages.
#
# Guide:
#
# Configure your SMTP provider according to its SMTP
# credentials and security requirements.
#
# Example using Gmail SMTP:
#
auth.email.config(
    host="smtp.gmail.com",
    port=587,
    username="your-email@gmail.com",
    password="your-app-password",
    sender="your-email@gmail.com",
    sender_name="Total Chaos",
    use_tls=True,
)
#
# sender_name:
#     Optional.
#     Defaults to the sender email address.
#
# use_tls:
#     Optional.
#     Defaults to True.
#
# SECURITY:
#     Do not hard-code SMTP passwords in production.
#     Use environment variables or another secure secret
#     management system.
#
#
# ==========================================================
# GOOGLE OAUTH CONFIGURATION
# ==========================================================
#
# Configure Google OAuth authentication.
#
# Create/manage Google OAuth credentials from:
#
#     https://console.cloud.google.com/apis/credentials
#
# Required:
#
#     client_id
#     client_secret
#     redirect_uri
#
# The redirect URI must exactly match the callback URL
# configured in Google Cloud.
#
auth.google.config(
    client_id="your-google-client-id",
    client_secret="your-google-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/google/callback"
    ),
)


# ==========================================================
# GITHUB OAUTH CONFIGURATION
# ==========================================================
#
# Configure GitHub OAuth authentication.
#
# Create a GitHub OAuth App and obtain:
#
#     Client ID
#     Client Secret
#
# The callback URL configured in GitHub must exactly match
# the redirect_uri used here.
#
auth.github.config(
    client_id="your-github-client-id",
    client_secret="your-github-client-secret",
    redirect_uri=(
        "https://app.totalchaos.online/"
        "tc-auth/github/callback"
    ),
)


# ==========================================================
# JWT CONFIGURATION
# ==========================================================
#
# JWT configuration is optional.
#
# tc-auth already provides default JWT configuration, so
# there is no need to call auth.jwt.config() unless you want
# to customize the JWT settings.
#
# Custom configuration:
#
auth.jwt.config(
    secret_key="your-super-secret-key",
    algorithm="HS256",
    session_duration_days=7,
)
#
# Parameters:
#
#     secret_key:
#         Secret used to sign and verify JWT tokens.
#
#     algorithm:
#         JWT signing algorithm.
#
#     session_duration_days:
#         Number of days newly created sessions/tokens remain
#         valid.
#
# SECURITY:
#     Use a strong randomly generated secret key in production.
#     Never commit the secret key to Git.
#
#
# ==========================================================
# RUN APPLICATION
# ==========================================================
#
# Starts the FastAPI application using Uvicorn.
#
def run():
    import uvicorn

    uvicorn.run(
        "connect:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


# ==========================================================
# APPLICATION ENTRY POINT
# ==========================================================
#
# Run the application when this file is executed directly.
#
if __name__ == "__main__":
    run()