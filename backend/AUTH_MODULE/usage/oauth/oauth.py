from usage import auth


# ==========================================================
# OAUTH LOGIN
# ==========================================================
#
# Authenticates a user through an OAuth provider.
#
# Required:
#     provider
#     provider_user_id
#
# Optional:
#     name
#     email
#     avatar_url
#     ip_address
#     user_agent
#
# Behavior:
#     - If the OAuth account is already linked, the linked
#       account will be used.
#
#     - If the OAuth account is not linked to any account,
#       a new account will be created.
#
#     - A newly created account is automatically linked to
#       the OAuth provider account using the user's email.
#
#     - A successful OAuth login returns the same login
#       response structure used by auth.service.login().
#
#     - ip_address and user_agent are used for the session
#       record. If not provided, None will be used.
#
# Returns:
#     dict:
#     {
#         "access_token": access_token,
#         "token_type": "Bearer",
#         "account": account
#     }
#
auth.oauth.login(
    provider="github",
    provider_user_id="1234567890",
    name="testuser",
    email="testuser@example.com",
    avatar_url="https://example.com/avatar.jpg",
    ip_address="127.0.0.1",
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
)


# ==========================================================
# FIND OAUTH ACCOUNT
# ==========================================================
#
# Finds an OAuth account using the provider and the user's
# provider-specific ID.
#
# Required:
#     provider
#     provider_user_id
#
# Both fields are required.
#
# Returns:
#     dict:
#     {
#         "id": 1,
#         "account_id": 1,
#         "provider": "github",
#         "provider_user_id": "1234567890",
#         "created_at": "2026-08-11T18:11:00.001639"
#     }
#
auth.oauth.find_oauth(
    provider="github",
    provider_user_id="1234567890",
)


# ==========================================================
# LINK OAUTH ACCOUNT
# ==========================================================
#
# Links an OAuth provider account to an existing account.
#
# Required:
#     account_id
#     provider
#     provider_user_id
#
# All fields are mandatory.
#
# Returns:
#     dict:
#         OAuth account object containing:
#         - id
#         - account_id
#         - provider
#         - provider_user_id
#         - created_at
#
auth.oauth.link_account(
    account_id=1,
    provider="github",
    provider_user_id="1234567890",
)


# ==========================================================
# UNLINK OAUTH ACCOUNT
# ==========================================================
#
# Removes an OAuth provider link from an existing account.
#
# Required:
#     account_id
#     provider
#
# All fields are mandatory.
#
# Returns:
#     dict:
#         OAuth account object containing the same fields
#         returned by find_oauth().
#
auth.oauth.unlink_account(
    account_id=1,
    provider="github",
)


# ==========================================================
# GET ALL OAUTH ACCOUNTS
# ==========================================================
#
# Returns a paginated list of OAuth account records.
#
# All parameters are optional.
#
# Parameters:
#     page (int, optional):
#         Page number.
#         Defaults to 1.
#
#     page_size (int, optional):
#         Number of OAuth accounts returned per page.
#         Defaults to 10.
#
# Pagination:
#     Results are paginated and start from the latest
#     OAuth account record.
#
#     Example:
#
#         page=1, page_size=10
#         -> Latest 10 OAuth accounts
#
#         page=2, page_size=10
#         -> Next 10 OAuth accounts
#
# Returns:
#     list[dict]:
#         A list of OAuth account objects.
#
# Each object uses the same structure as find_oauth().
#
auth.oauth.get_all(
    page=1,
    page_size=10,
)


# ==========================================================
# QUERY OAUTH ACCOUNTS
# ==========================================================
#
# Searches OAuth account records using an exact field value.
#
# Required:
#     field
#     value
#
# Supported fields:
#     - id
#     - account_id
#     - provider_id
#
# Matching:
#     - Partial matching is NOT supported.
#     - Results use absolute/exact matching.
#
# Value:
#     value should be provided as a string.
#     The SDK automatically typecasts the value internally
#     when required.
#
# Returns:
#     list[dict]:
#         A list of matching OAuth account objects.
#
# If no records match:
#     Returns an empty list.
#
auth.oauth.query(
    field="id",
    value="1",
)