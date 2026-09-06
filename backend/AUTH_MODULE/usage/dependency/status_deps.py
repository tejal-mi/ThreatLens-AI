from fastapi import Depends
from usage import auth


# ==========================================================
# STATUS DEPENDENCIES
# ==========================================================
#
# Status dependencies are used to restrict FastAPI endpoints
# based on the authenticated user's account status.
#
# They use auth.deps.get_current_account() internally, so the
# request must first pass the normal authentication checks.
#
# Available status checks:
#
#     require()
#         Allow exactly one specific status.
#
#     allow()
#         Allow one or more specified statuses.
#
#     block()
#         Block one or more specified statuses.
#
# Each method returns a FastAPI dependency that can be used
# with Depends().
#
#
# ==========================================================
# REQUIRE STATUS
# ==========================================================
#
# Allows access only when the authenticated user's status
# exactly matches the specified status.
#
# Parameters:
#
#     status (str):
#         The only status allowed to access the endpoint.
#
# Example:
#
#     Only active accounts can access the endpoint.
#
@app.get("/active")
def active_route(
    user=Depends(auth.status.require("active"))
):
    return user
#
#
# If the user's status does not match the required status,
# PermissionDeniedError is raised.
#
# Example:
#
#     User status: "inactive"
#     Required:    "active"
#
#     -> PermissionDeniedError
#
#
# ==========================================================
# ALLOW STATUSES
# ==========================================================
#
# Allows access when the authenticated user's status matches
# ANY of the specified statuses.
#
# Multiple statuses can be provided.
#
# Parameters:
#
#     *statuses (str):
#         One or more statuses allowed to access the endpoint.
#
# Example:
#
#     Both active and pending accounts can access the route.
#
@app.get("/account-area")
def account_area(
    user=Depends(
        auth.status.allow("active", "pending")
    )
):
    return user
#
#
# Status matching:
#
#     user status = "active"
#         -> allowed
#
#     user status = "pending"
#         -> allowed
#
#     user status = "inactive"
#         -> PermissionDeniedError
#
#
# ==========================================================
# BLOCK STATUSES
# ==========================================================
#
# Denies access when the authenticated user's status matches
# ANY of the specified statuses.
#
# All other statuses are allowed.
#
# Parameters:
#
#     *statuses (str):
#         One or more statuses that are blocked.
#
# Example:
#
#     Prevent inactive accounts from accessing the endpoint.
#
@app.get("/user-area")
def user_area(
    user=Depends(
        auth.status.block("inactive")
    )
):
    return user
#
#
# Multiple statuses can be blocked:
#
@app.get("/restricted")
def restricted_route(
    user=Depends(
        auth.status.block("inactive", "suspended")
    )
):
    return user
#
#
# Status matching:
#
#     user status = "inactive"
#         -> PermissionDeniedError
#
#     user status = "suspended"
#         -> PermissionDeniedError
#
#     user status = "active"
#         -> allowed
#
#
# ==========================================================
# STATUS CHECK SUMMARY
# ==========================================================
#
# require("active")
#     -> Only "active" is allowed.
#
# allow("active", "pending")
#     -> "active" OR "pending" is allowed.
#
# block("inactive", "suspended")
#     -> "inactive" and "suspended" are blocked.
#
#
# ==========================================================
# HOW STATUS DEPENDENCIES WORK
# ==========================================================
#
# Status checks are performed after authentication.
#
# Request
#    |
#    v
# JWT + Session Verification
#    |
#    v
# auth.deps.get_current_account()
#    |
#    v
# Get authenticated account
#    |
#    v
# Check account["status"]
#    |
#    +---- Allowed ----> FastAPI route executes
#    |
#    +---- Denied -----> PermissionDeniedError
#
#
# Status dependencies therefore do not replace authentication.
# They add an authorization/access check based on the account
# status.
#
#
# ==========================================================
# RETURN VALUE
# ==========================================================
#
# When the status check succeeds, the dependency returns the
# authenticated account object.
#
# Example:
#
@app.get("/profile")
def profile(
    user=Depends(auth.status.require("active"))
):
    return {
        "id": user["id"],
        "name": user["name"],
        "status": user["status"],
    }
#
#
# ==========================================================
# COMMON EXAMPLES
# ==========================================================
#
# Only active accounts:
#
@app.get("/dashboard")
def dashboard(
    user=Depends(auth.status.require("active"))
):
    return user
#
#
# Active or pending accounts:
#
@app.get("/account")
def account(
    user=Depends(
        auth.status.allow("active", "pending")
    )
):
    return user
#
#
# Everyone except inactive accounts:
#
@app.get("/content")
def content(
    user=Depends(
        auth.status.block("inactive")
    )
):
    return user
#
#
# Block multiple statuses:
#
@app.get("/protected")
def protected(
    user=Depends(
        auth.status.block("inactive", "suspended")
    )
):
    return user