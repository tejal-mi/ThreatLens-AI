from usage import auth
from fastapi import Depends


# ==========================================================
# AUTH DEPENDENCIES
# ==========================================================
#
# The auth.deps module provides FastAPI dependencies for
# authenticating and identifying the current user.
#
# It handles both:
#
#     1. JWT verification
#     2. Session verification
#
# These dependencies are intended to be used with FastAPI's
# Depends() system to protect routes and access information
# about the currently authenticated account.
#
#
# ==========================================================
# CURRENT USER RESPONSE
# ==========================================================
#
# auth.deps.get_current() returns the complete authentication
# context for the current request.
#
# The returned object contains:
#
#     {
#         "account": account,
#         "session": session,
#         "payload": payload
#     }
#
# account:
#     The authenticated account object.
#
# session:
#     The authenticated session object.
#
# payload:
#     The decoded and verified JWT payload.
#
# The dependency verifies the authentication information
# before returning this data.
#
# Returns:
#     dict:
#         {
#             "account": account,
#             "session": session,
#             "payload": payload
#         }
#
#
# ==========================================================
# CURRENT ACCOUNT
# ==========================================================
#
# Returns only the authenticated account from the current
# authentication context.
#
# Returns:
#     dict:
#         Current authenticated account.
#
# Use this when the route only needs account information and
# does not need session or JWT payload information.
#
auth.deps.get_current_account()


# ==========================================================
# CURRENT SESSION
# ==========================================================
#
# Returns only the authenticated session from the current
# authentication context.
#
# Returns:
#     dict:
#         Current authenticated session.
#
# Use this when the route needs session information such as
# session ID, account ID, IP address, User-Agent, or expiry.
#
auth.deps.get_current_session()


# ==========================================================
# CURRENT PAYLOAD
# ==========================================================
#
# Returns only the verified JWT payload from the current
# authentication context.
#
# Returns:
#     dict:
#         Current JWT payload.
#
# Example payload:
#
#     {
#         "aid": 1,
#         "sid": 60,
#         "token": "...",
#         "exp": 1787129867
#     }
#
# Use this when the route only needs JWT claims.
#
auth.deps.get_current_payload()


# ==========================================================
# WHY USE auth.deps?
# ==========================================================
#
# auth.deps is designed to keep authentication verification
# outside your route logic.
#
# Instead of manually:
#
#     - extracting the token
#     - decoding the JWT
#     - validating the JWT
#     - finding the session
#     - checking the session
#     - finding the account
#     - checking authentication state
#
# on every protected endpoint, use an auth.deps dependency.
#
# The dependency performs the authentication work and provides
# the verified account/session/payload to the route.
#
#
# ==========================================================
# JWT + SESSION VERIFICATION
# ==========================================================
#
# Authentication is verified using both the JWT and the
# corresponding session.
#
# JWT:
#     Provides the authentication token and its claims.
#
# Session:
#     Provides server-side session state and allows the
#     authentication system to validate the session.
#
# This means authentication is not based only on whether a
# JWT can be decoded.
#
# The dependency verifies the authentication context and then
# provides the associated account, session, and payload.
#
#
# ==========================================================
# WHEN TO USE EACH DEPENDENCY
# ==========================================================
#
# Use get_current() when:
#
#     The endpoint needs the complete authentication context:
#
#         account + session + payload
#
#
# Use get_current_account() when:
#
#     The endpoint only needs information about the logged-in
#     account.
#
#
# Use get_current_session() when:
#
#     The endpoint needs information about the current session.
#
#
# Use get_current_payload() when:
#
#     The endpoint only needs verified JWT claims such as:
#
#         aid
#         sid
#         exp
#         token
#
#
# ==========================================================
# FASTAPI USAGE
# ==========================================================
#
# auth.deps is primarily intended to be used with FastAPI's
# Depends() mechanism.
#
# A protected endpoint can use the dependency to obtain the
# authenticated user/context before the route executes.
#
# Example:
#
@app.get("/me")
def fetch_me(user=Depends(auth.deps.get_current())):
    return user
#
#
# The dependency handles authentication before the endpoint
# logic is executed.
#
# If authentication succeeds:
#
#     The route receives the authenticated data.
#
# If authentication fails:
#
#     The dependency stops the request before the route logic
#     continues.
#
#
# ==========================================================
# EXAMPLE: CURRENT ACCOUNT
# ==========================================================
#
# Use the account-specific dependency when the endpoint only
# needs the logged-in user's account.
#
@app.get("/me/account")
def fetch_account(
    account=Depends(auth.deps.get_current_account())
):
    return account
#
#
# ==========================================================
# EXAMPLE: CURRENT SESSION
# ==========================================================
#
# Use the session-specific dependency when the endpoint needs
# information about the current session.
#
@app.get("/me/session")
def fetch_session(
    session=Depends(auth.deps.get_current_session())
):
    return session
#
#
# ==========================================================
# EXAMPLE: CURRENT JWT PAYLOAD
# ==========================================================
#
# Use the payload-specific dependency when only verified JWT
# claims are required.
#
@app.get("/me/payload")
def fetch_payload(
    payload=Depends(auth.deps.get_current_payload())
):
    return payload