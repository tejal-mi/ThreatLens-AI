
from usage import auth


# ==========================================================
# CREATE USER
# ==========================================================
#
# Creates a new user account.
#
# All parameters are optional. If a parameter is not provided,
# its default value will be used (where applicable).
#
# Password:
#   - Pass the password as raw/plain text.
#   - The SDK automatically hashes the password before storing
#     it in the database.
#
# Unique fields:
#   - email
#   - handle
#   - phone
#
# Returns:
#   dict: The newly created account.
#
# Example return:
# {
#     "id": 1,
#     "uid": "1d7d1310-13e5-4769-8511-d3bc837cf55f",
#     "name": "Test User",
#     "handle": "testuser",
#     "email": "testuser@example.com",
#     "phone": "1234567890",
#     "avatar_url": "https://example.com/avatar.jpg",
#     "role": "user",
#     "status": "active",
#     "created_at": "2026-08-11T18:11:00.001639",
#     "updated_at": "2026-08-11T18:11:00.001639"
# }
#
# Parameters:
#   name       (str, optional): User's display name.
#   password   (str, optional): Raw password. Automatically hashed.
#   email      (str, optional): User's email address. Must be unique.
#   handle     (str, optional): Username/handle. Must be unique.
#   avatar_url (str, optional): URL of the user's avatar.
#   phone      (str, optional): User's phone number. Must be unique.
#   role       (str, optional): Account role. Defaults to "user".
#   status     (str, optional): Account status. Defaults to None.
#
# Usage:
result = auth.account.create_user(
    name="Test User",
    password="123456",
    email="testuser@example.com",
    handle="testuser",
    avatar_url="https://example.com/avatar.jpg",
    phone="+651234567890",
    role="user",
    status="active",
)


# ==========================================================
# DELETE USER
# ==========================================================
#
# Permanently deletes an account.
#
# Parameters:
#   account_id (int): Numeric database ID of the account.
#
# Returns:
#   None
#
# Example:
auth.account.delete_user(
    account_id=1,
)


# ==========================================================
# UPDATE USER
# ==========================================================
#
# Updates one or more fields of an existing account.
#
# Required:
#   - account_id
#
# Optional:
#   - All other fields.
#
# Update behavior:
#   - Only fields that contain a value are updated.
#   - Fields passed as None or an empty value are ignored.
#   - The existing value is preserved for ignored fields.
#
# NOTE:
#   This method does not update the password, role, or status.
#   Use super_update(), update_password(), update_role(), or
#   update_status() when those fields need to be changed.
#
# Parameters:
#   account_id (int): Numeric database ID of the account.
#   name       (str, optional): Updated display name.
#   email      (str, optional): Updated email. Must be unique.
#   handle     (str, optional): Updated handle. Must be unique.
#   avatar_url (str, optional): Updated avatar URL.
#   phone      (str, optional): Updated phone. Must be unique.
#
# Returns:
#   None
#
# Example:
result = auth.account.update_user(
    account_id=1,
    name="Updated User",
    email="updateduser@example.com",
    handle="updateduser",
    avatar_url="https://example.com/avatar.jpg",
    phone="+651234567890",
)


# ==========================================================
# SUPER UPDATE
# ==========================================================
#
# Updates any supported field of an existing account,
# including privileged account fields.
#
# Required:
#   - account_id
#
# Optional:
#   - name
#   - email
#   - handle
#   - avatar_url
#   - phone
#   - role
#   - status
#   - password
#
# Update behavior:
#   - Only fields that contain a value are updated.
#   - Fields passed as None or an empty value are ignored.
#   - Existing values are preserved for ignored fields.
#
# Password:
#   - Pass the password as raw/plain text.
#   - The SDK automatically hashes it before storing it.
#
# Defaults:
#   role   -> "user"
#   status -> None
#
# Returns:
#   None
#
# Example:
result = auth.account.super_update(
    account_id=1,
    name="Updated User",
    email="updateduser@example.com",
    handle="updateduser",
    avatar_url="https://example.com/avatar.jpg",
    phone="+651234567890",
    role="admin",
    status="active",
    password="updatedpassword",
)


# ==========================================================
# UPDATE PASSWORD
# ==========================================================
#
# Changes the password of an existing account.
#
# Required:
#   - account_id
#   - password
#
# Password:
#   - Pass the password as raw/plain text.
#   - The SDK automatically hashes the password before storing
#     it in the database.
#
# Returns:
#   None
#
# Example:
auth.account.update_password(
    account_id=1,
    password="updatedpassword",
)


# ==========================================================
# UPDATE STATUS
# ==========================================================
#
# Changes the status of an existing account.
#
# Required:
#   - account_id
#   - status
#
# Parameters:
#   account_id (int): Numeric database ID of the account.
#   status     (str): New account status.
#
# NOTE:
#   The default status value in the account model is None,
#   but this method requires an explicit status value.
#
# Returns:
#   None
#
# Example:
auth.account.update_status(
    account_id=1,
    status="active",
)


# ==========================================================
# UPDATE ROLE
# ==========================================================
#
# Changes the role of an existing account.
#
# Required:
#   - account_id
#   - role
#
# Parameters:
#   account_id (int): Numeric database ID of the account.
#   role       (str): New account role.
#
# NOTE:
#   The default role when creating an account is "user",
#   but this method requires an explicit role value.
#
# Returns:
#   None
#
# Example:
auth.account.update_role(
    account_id=1,
    role="admin",
)


# ==========================================================
# GET ALL ACCOUNTS
# ==========================================================
#
# Returns a paginated list of all accounts.
#
# Parameters:
#   page  (int, optional):
#       Page number to retrieve.
#       Defaults to 1.
#
#   limit (int, optional):
#       Number of accounts returned per page.
#       Defaults to 10.
#       Must be between 1 and 100.
#
# Pagination:
#   Pagination divides the complete list of accounts into
#   smaller pages.
#
#   Example:
#       page=1, limit=10
#       -> Returns accounts 1-10
#
#       page=2, limit=10
#       -> Returns accounts 11-20
#
#       page=3, limit=10
#       -> Returns accounts 21-30
#
#   To retrieve the next set of accounts, increase the page
#   number while keeping the limit the same.
#
# Returns:
#   list[dict]: A list containing account objects.
#
#   Each account object has the same structure as the object
#   returned by create_user().
#
# Example:
# [
#     {
#         "id": 1,
#         "uid": "1d7d1310-13e5-4769-8511-d3bc837cf55f",
#         "name": "Test User",
#         "handle": "testuser",
#         "email": "testuser@example.com",
#         "phone": "1234567890",
#         "avatar_url": "https://example.com/avatar.jpg",
#         "role": "user",
#         "status": "active",
#         "created_at": "2026-08-11T18:11:00.001639",
#         "updated_at": "2026-08-11T18:11:00.001639"
#     }
# ]
#
# Example:
result = auth.account.get_all(
    page=1,
    limit=10,
)


# ==========================================================
# QUERY ACCOUNTS
# ==========================================================
#
# Searches for accounts using a specific account field.
#
# Supported fields:
#   - name
#   - handle
#   - email
#   - phone
#   - uid
#
# Parameters:
#   field (str):
#       Account field to search.
#
#   value (str):
#       Value to search for.
#       The SDK automatically typecasts the value when
#       required by the selected field.
#
# Matching behavior:
#
#   name:
#       Searches using the provided name value.
#
#   handle:
#       Supports partial matching.
#
#   email:
#       Supports partial matching.
#
#   phone:
#       Supports partial matching.
#
#   uid:
#       Searches using the account UUID.
#
# Returns:
#   list[dict]: A list of matching account objects.
#
#   Each account object has the same structure as the object
#   returned by create_user().
#
# If no account matches the query:
#   Returns an empty list:
#
#       []
#
# Example:
result = auth.account.query(
    field="name",
    value="Test User",
)
#
# Example output:
# [
#     {
#         "id": 1,
#         "uid": "1d7d1310-13e5-4769-8511-d3bc837cf55f",
#         "name": "Test User",
#         "handle": "testuser",
#         "email": "testuser@example.com",
#         "phone": "1234567890",
#         "avatar_url": "https://example.com/avatar.jpg",
#         "role": "user",
#         "status": "active",
#         "created_at": "2026-08-11T18:11:00.001639",
#         "updated_at": "2026-08-11T18:11:00.001639"
#     }
# ]

