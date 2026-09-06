from fastapi import Request
from usage import auth


# ==========================================================
# GITHUB OAUTH
# ==========================================================
#
# The GitHub OAuth service provides a complete GitHub
# authentication flow for FastAPI applications.
#
# It handles:
#
#     1. GitHub OAuth configuration
#     2. Redirecting users to GitHub
#     3. Processing the OAuth callback
#     4. Retrieving the GitHub user profile
#     5. Retrieving the user's verified primary email
#     6. Creating or retrieving the linked account
#     7. Creating the authentication session
#     8. Redirecting the user back to the frontend
#
# Before using login() or callback(), GitHub OAuth must be
# configured using config().
#
#
# ==========================================================
# CONFIGURE GITHUB OAUTH
# ==========================================================
#
# Configures the GitHub OAuth client.
#
# Required:
#
#     client_id:
#         GitHub OAuth application client ID.
#
#     client_secret:
#         GitHub OAuth application client secret.
#
#     redirect_uri:
#         OAuth callback URL registered in the GitHub OAuth
#         application.
#
# Example:
#
auth.github_oauth.config(
    client_id="YOUR_GITHUB_CLIENT_ID",
    client_secret="YOUR_GITHUB_CLIENT_SECRET",
    redirect_uri="https://api.example.com/oauth/github/callback",
)


# ==========================================================
# LOAD GITHUB OAUTH CONFIGURATION
# ==========================================================
#
# Returns the currently configured GitHub OAuth settings.
#
# Returns:
#
#     dict:
#     {
#         "client_id": client_id,
#         "client_secret": client_secret,
#         "redirect_uri": redirect_uri
#     }
#
# WARNING:
#     The returned object contains client_secret.
#     Do not expose this through a public API endpoint.
#
config = auth.github_oauth.load()


# ==========================================================
# GITHUB LOGIN
# ==========================================================
#
# Starts the GitHub OAuth login flow.
#
# The user is redirected to GitHub's authorization page.
#
# Parameters:
#
#     request (Request):
#         FastAPI/Starlette request object.
#
#     frontend_url (str):
#         Frontend URL where the user should be redirected
#         after the OAuth callback is completed.
#
# The frontend URL is temporarily stored in the session so
# callback() can redirect the user back to the frontend.
#
# Returns:
#
#     RedirectResponse:
#         Redirects the user to GitHub's authorization page.
#
# NOTE:
#     login() is asynchronous and must be awaited.
#
# Example:
#
@app.get("/oauth/github/login")
async def github_login(request: Request):
    return await auth.github_oauth.login(
        request=request,
        frontend_url="https://app.example.com",
    )


# ==========================================================
# GITHUB OAUTH CALLBACK
# ==========================================================
#
# Handles the callback sent by GitHub after authentication.
#
# The callback:
#
#     1. Retrieves the frontend URL from the session.
#     2. Exchanges the authorization code for an access token.
#     3. Retrieves the GitHub user profile.
#     4. Attempts to get the user's email from the profile.
#     5. If the email is not available, retrieves the user's
#        GitHub email list.
#     6. Selects the primary and verified email.
#     7. Passes the GitHub user information to
#        auth.oauth.login().
#     8. Creates or retrieves the linked account.
#     9. Creates the authentication session.
#    10. Redirects the user to the frontend.
#
# Optional:
#
#     ip_address:
#         Client IP address.
#
#     user_agent:
#         Client User-Agent.
#
# These values are passed to auth.oauth.login() and can be
# stored with the authentication session.
#
# Returns:
#
#     RedirectResponse:
#         Redirects to:
#
#         {frontend_url}/oauth/callback?access_token=...
#
# NOTE:
#     callback() is asynchronous and must be awaited.
#
# Example:
#
@app.get("/oauth/github/callback")
async def github_callback(request: Request):
    return await auth.github_oauth.callback(
        request=request,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


# ==========================================================
# GITHUB USER DATA
# ==========================================================
#
# The callback retrieves the GitHub user profile from:
#
#     GET /user
#
# The following fields are used:
#
#     user["id"]
#         GitHub user's unique provider ID.
#
#     user.get("name")
#         User's display name.
#
#     user.get("email")
#         User's email when publicly available.
#
#     user.get("avatar_url")
#         GitHub profile avatar.
#
# The provider ID is converted to a string before being passed
# to auth.oauth.login().
#
#
# ==========================================================
# GITHUB EMAIL HANDLING
# ==========================================================
#
# GitHub may not include the user's email in the main user
# profile.
#
# If:
#
#     user.get("email") is None
#
# the callback requests:
#
#     GET /user/emails
#
# It then searches for an email where:
#
#     primary == True
#     verified == True
#
# The first matching email is used for account linking.
#
# This allows the authentication system to obtain a verified
# primary GitHub email even when it is not publicly visible.
#
#
# ==========================================================
# GITHUB OAUTH FLOW
# ==========================================================
#
# Typical request flow:
#
#     Frontend
#        |
#        v
#     /oauth/github/login
#        |
#        v
#     GitHub
#        |
#        v
#     User authenticates
#        |
#        v
#     /oauth/github/callback
#        |
#        v
#     GitHubOAuth.callback()
#        |
#        v
#     GitHub user profile
#        |
#        +---- Email available
#        |         -> Use profile email
#        |
#        +---- Email unavailable
#                  -> Get /user/emails
#                  -> Find primary + verified email
#        |
#        v
#     auth.oauth.login()
#        |
#        +---- Existing OAuth account
#        |         -> Use linked account
#        |
#        +---- New OAuth account
#                  -> Create account
#                  -> Link GitHub account
#        |
#        v
#     Login response
#        |
#        v
#     Frontend /oauth/callback
#
#
# ==========================================================
# IMPORTANT CONFIGURATION
# ==========================================================
#
# The redirect_uri must exactly match the callback URL
# registered in the GitHub OAuth application.
#
# Example:
#
#     GitHub OAuth application:
#         https://api.example.com/oauth/github/callback
#
#     Application:
#         redirect_uri="https://api.example.com/oauth/github/callback"
#
# A mismatch between these URLs will cause the OAuth flow
# to fail.
#
#
# ==========================================================
# COMPLETE FASTAPI EXAMPLE
# ==========================================================
#
from fastapi import FastAPI, Request

app = FastAPI()


# Configure GitHub OAuth once during application setup.
auth.github_oauth.config(
    client_id="YOUR_GITHUB_CLIENT_ID",
    client_secret="YOUR_GITHUB_CLIENT_SECRET",
    redirect_uri="https://api.example.com/oauth/github/callback",
)


# Start GitHub OAuth.
@app.get("/oauth/github/login")
async def github_login(request: Request):
    return await auth.github_oauth.login(
        request=request,
        frontend_url="https://app.example.com",
    )


# Handle GitHub OAuth callback.
@app.get("/oauth/github/callback")
async def github_callback(request: Request):
    return await auth.github_oauth.callback(
        request=request,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
#
#
# After successful authentication, the user is redirected to:
#
#     https://app.example.com/oauth/callback?access_token=...
#
#
# ==========================================================
# SECURITY NOTES
# ==========================================================
#
# - Keep client_secret private.
# - Do not expose load() through a public endpoint.
# - Register the exact callback URL with GitHub.
# - Use HTTPS in production.
# - Only allow trusted frontend redirect destinations.
# - Do not accept arbitrary frontend_url values from
#   untrusted users.
# - Handle the returned access token securely on the frontend.
# - Do not log GitHub access tokens or client secrets.