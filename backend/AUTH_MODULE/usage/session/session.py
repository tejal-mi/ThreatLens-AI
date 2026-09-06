from usage import auth


# ==========================================================
# CREATE SESSION
# ==========================================================
#
# Creates a new authentication session for an account.
#
# Parameters:
#     account_id (int):
#         ID of the account for which the session is created.
#
#     ip_address (str):
#         IP address of the client.
#
#     user_agent (str):
#         User-Agent of the client.
#
# Returns:
#     dict:
#     {
#         "session_id": session.id,
#         "token": token
#     }
#
# NOTE:
#     The returned token is the session token that can be used
#     for authentication. The database stores its hash rather
#     than the raw token.
#
auth.session.create_session(
    account_id=1,
    ip_address="[IP_ADDRESS]",
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
)


# ==========================================================
# GET SESSION BY ID
# ==========================================================
#
# Retrieves a session using its numeric session ID.
#
# Parameters:
#     session_id (int):
#         ID of the session.
#
# Returns:
#     dict:
#         Session object.
#
# Example session object:
#
#     {
#         "id": 1,
#         "account_id": 1,
#         "token_hash": "...",
#         "ip_address": "2405:201:301a:1a0b:90a:b200:b160:f17e",
#         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
#         "expires_at": "2026-08-12 00:11:03.646932",
#         "created_at": "2026-08-12 00:11:03.646932"
#     }
#
auth.session.by_id(
    session_id=1,
)


# ==========================================================
# GET SESSIONS BY ACCOUNT
# ==========================================================
#
# Retrieves the sessions associated with an account.
#
# Parameters:
#     account_id (int):
#         ID of the account.
#
# Returns:
#     list[dict]:
#         List of session objects belonging to the account.
#
auth.session.by_account(
    account_id=1,
)


# ==========================================================
# DESTROY SESSION
# ==========================================================
#
# Deletes a specific session from the database.
#
# Parameters:
#     session_id (int):
#         ID of the session to delete.
#
# Returns:
#     None
#
auth.session.destroy_session(
    session_id=1,
)


# ==========================================================
# DESTROY ALL ACCOUNT SESSIONS
# ==========================================================
#
# Deletes all sessions belonging to an account.
#
# Parameters:
#     account_id (int):
#         ID of the account.
#
# Returns:
#     None
#
auth.session.destroy_all(
    account_id=1,
)


# ==========================================================
# CLEANUP EXPIRED SESSIONS
# ==========================================================
#
# Deletes all expired sessions from the database.
#
# Parameters:
#     None
#
# Returns:
#     None
#
auth.session.cleanup_expired()


# ==========================================================
# CLEAR ALL SESSIONS
# ==========================================================
#
# Immediately deletes all session records from the database.
#
# Parameters:
#     None
#
# WARNING:
#     This removes every session, including active sessions.
#
# Returns:
#     None
#
auth.session.clear_all()


# ==========================================================
# GET ALL SESSIONS
# ==========================================================
#
# Returns a paginated list of session objects.
#
# Parameters:
#
#     page (int, optional):
#         Page number to retrieve.
#         Defaults to 1.
#
#     limit (int, optional):
#         Number of sessions returned per page.
#         Defaults to 10.
#
# Pagination:
#     Pagination divides all session records into smaller
#     pages.
#
#     Example with limit=10:
#
#         page=1 -> Records 1-10
#         page=2 -> Records 11-20
#         page=3 -> Records 21-30
#
#     Increase the page number to retrieve the next set
#     of sessions.
#
# Returns:
#     list[dict]:
#         A list of session objects.
#
auth.session.get_all(
    page=1,
    limit=10,
)


# ==========================================================
# QUERY SESSIONS
# ==========================================================
#
# Searches session records using a specific field.
#
# Supported fields:
#     - id
#     - sid
#     - ip
#     - token
#
# Parameters:
#
#     field (str):
#         Session field to search.
#
#     value (str):
#         Value to search for.
#         Typecasting is handled automatically.
#
# Matching:
#     - Partial matching is supported for token and IP.
#     - Other fields use their supported matching behavior.
#
# Returns:
#     list[dict]:
#         A list of matching session objects.
#
# Example:
#
auth.session.query(
    field="id",
    value="1",
)