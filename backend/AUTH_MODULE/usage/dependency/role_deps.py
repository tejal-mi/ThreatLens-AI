from fastapi import Depends
from usage import auth


# ==========================================================
# ROLE DEPENDENCIES
# ==========================================================
#
# Role dependencies are used to restrict access to FastAPI
# endpoints based on the authenticated user's role.
#
# The role dependency uses auth.deps.get_current() internally,
# so the request must first pass the normal JWT + session
# authentication checks.
#
# Available role checks:
#
#     require()
#         Allow exactly one specific role.
#
#     allow()
#         Allow one or more specified roles.
#
#     block()
#         Block one or more specified roles.
#
# Each method returns a FastAPI dependency function that can
# be passed to Depends().
#
#
# ==========================================================
# REQUIRE
# ==========================================================
#
# Allows access only when the authenticated user's role
# exactly matches the specified role.
#
# Parameters:
#
#     role (str):
#         The only role allowed to access the endpoint.
#
# Example:
#
#     Only users with the "admin" role can access the route.
#
@app.get("/admin")
def admin_route(
    user=Depends(auth.roles.require("admin"))
):
    return user
#
#
# If the user's role does not match the required role,
# PermissionDeniedError is raised.
#
# Example:
#
#     User role: "user"
#     Required:  "admin"
#
#     -> PermissionDeniedError
#
#
# ==========================================================
# ALLOW
# ==========================================================
#
# Allows access when the authenticated user's role matches
# ANY of the specified roles.
#
# Multiple roles can be provided.
#
# Parameters:
#
#     *roles (str):
#         One or more roles allowed to access the endpoint.
#
# Example:
#
#     Users with either "admin" or "moderator" can access
#     the endpoint.
#
@app.get("/manage")
def manage_route(
    user=Depends(
        auth.roles.allow("admin", "moderator")
    )
):
    return user
#
#
# Role matching:
#
#     user role = "admin"
#         -> allowed
#
#     user role = "moderator"
#         -> allowed
#
#     user role = "user"
#         -> PermissionDeniedError
#
#
# ==========================================================
# BLOCK
# ==========================================================
#
# Denies access when the authenticated user's role matches
# ANY of the specified roles.
#
# All other roles are allowed.
#
# Parameters:
#
#     *roles (str):
#         One or more roles that are blocked.
#
# Example:
#
#     Prevent administrators from accessing the endpoint.
#
@app.get("/user-area")
def user_area(
    user=Depends(
        auth.roles.block("admin")
    )
):
    return user
#
#
# Multiple roles can be blocked:
#
@app.get("/restricted")
def restricted_route(
    user=Depends(
        auth.roles.block("admin", "superadmin")
    )
):
    return user
#
#
# Role matching:
#
#     user role = "admin"
#         -> PermissionDeniedError
#
#     user role = "superadmin"
#         -> PermissionDeniedError
#
#     user role = "user"
#         -> allowed
#
#
# ==========================================================
# ROLE CHECK SUMMARY
# ==========================================================
#
# require("admin")
#     -> Only "admin" is allowed.
#
# allow("admin", "moderator")
#     -> "admin" OR "moderator" is allowed.
#
# block("admin", "superadmin")
#     -> "admin" AND "superadmin" are blocked.
#
#
# ==========================================================
# HOW ROLE DEPENDENCIES WORK
# ==========================================================
#
# Role checks are performed after authentication.
#
# Request
#    |
#    v
# JWT + Session Verification
#    |
#    v
# auth.deps.get_current()
#    |
#    v
# Get authenticated account
#    |
#    v
# Check account["role"]
#    |
#    +---- Allowed ----> FastAPI route executes
#    |
#    +---- Denied -----> PermissionDeniedError
#
#
# This means role dependencies do not replace authentication.
# They work on top of auth.deps and add authorization checks.
#
#
# ==========================================================
# COMBINING WITH OTHER DEPENDENCIES
# ==========================================================
#
# The role dependency returns the authenticated account.
#
# Therefore, the route can directly use the returned user.
#
@app.get("/admin/profile")
def admin_profile(
    user=Depends(auth.roles.require("admin"))
):
    return {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
    }
#
#
# ==========================================================
# COMMON EXAMPLES
# ==========================================================
#
# Only administrators:
#
@app.get("/admin/dashboard")
def admin_dashboard(
    user=Depends(auth.roles.require("admin"))
):
    return user
#
#
# Administrators or moderators:
#
@app.get("/moderation")
def moderation(
    user=Depends(
        auth.roles.allow("admin", "moderator")
    )
):
    return user
#
#
# Everyone except administrators:
#
@app.get("/user-content")
def user_content(
    user=Depends(
        auth.roles.block("admin")
    )
):
    return user
#
#
# Everyone except administrators and superadmins:
#
@app.get("/normal-users")
def normal_users(
    user=Depends(
        auth.roles.block("admin", "superadmin")
    )
):
    return user