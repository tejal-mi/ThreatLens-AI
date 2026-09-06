from usage import auth


# ==========================================================
# OTP
# ==========================================================
#
# The auth.otp module provides methods for creating,
# verifying, revoking, cleaning up, and querying OTP records.
#
# identifier:
#     The user's email address or phone number.
#
# purpose:
#     The purpose for which the OTP is being created.
#
#     Examples:
#         "login"
#         "signup"
#         "reset"
#
#
# ==========================================================
# CREATE OTP
# ==========================================================
#
# Creates a new OTP for the specified identifier and purpose.
#
# Required:
#     identifier
#     purpose
#
# Optional:
#     length
#     expiry
#
# Defaults:
#     length -> 6
#     expiry -> 300 seconds
#
# length:
#     Number of digits in the generated OTP.
#
# expiry:
#     Number of seconds for which the OTP remains valid.
#
# Returns:
#
#     dict:
#     {
#         "otp": otp,
#         "expires_at": expires_at
#     }
#
auth.otp.create(
    identifier="testuser@example.com",
    purpose="login",
    expiry=300,
    length=6,
)


# ==========================================================
# VERIFY OTP
# ==========================================================
#
# Verifies an OTP for the specified identifier and purpose.
#
# Required:
#     identifier
#     purpose
#     otp
#
# All fields are mandatory.
#
# Returns:
#     None
#
# Exceptions:
#
#     OTPNotFoundError:
#         Raised when no OTP exists for the specified
#         identifier and purpose.
#
#     OTPExpiredError:
#         Raised when the OTP has expired.
#
#     OTPInvalidError:
#         Raised when the supplied OTP is incorrect.
#
auth.otp.verify(
    identifier="testuser@example.com",
    purpose="login",
    otp="123456",
)


# ==========================================================
# REVOKE OTP
# ==========================================================
#
# Revokes the OTP for the specified identifier and purpose.
#
# Required:
#     identifier
#     purpose
#
# All fields are mandatory.
#
# If the OTP exists, it is deleted from the database.
#
# Returns:
#     None
#
auth.otp.revoke(
    identifier="testuser@example.com",
    purpose="login",
)


# ==========================================================
# CLEANUP EXPIRED OTPS
# ==========================================================
#
# Deletes all expired OTP records from the database.
#
# This method takes no arguments.
#
# Returns:
#     None
#
# Example:
#
auth.otp.cleanup()


# ==========================================================
# CLEAR ALL OTPS
# ==========================================================
#
# Immediately deletes all OTP records from the database,
# including active and expired OTPs.
#
# This method takes no arguments.
#
# Returns:
#     None
#
# WARNING:
#     This removes every OTP record immediately.
#
# Example:
#
auth.otp.clear_all()


# ==========================================================
# GET ALL OTPS
# ==========================================================
#
# Returns a paginated list of OTP records.
#
# Parameters:
#
#     page (int, optional):
#         Page number to retrieve.
#         Defaults to 1.
#
#     limit (int, optional):
#         Number of OTP records returned per page.
#         Defaults to 10.
#
#     limit must be between 1 and 100.
#
# Pagination:
#
#     Pagination divides the complete list of OTP records
#     into smaller pages.
#
#     Example with limit=10:
#
#         page=1 -> Records 1-10
#         page=2 -> Records 11-20
#         page=3 -> Records 21-30
#
#     Increase the page number to retrieve the next set
#     of records.
#
# Returns:
#
#     list[dict]:
#         A list of OTP objects.
#
# OTP object structure:
#
#     {
#         "id": 1,
#         "identifier": "testuser@example.com",
#         "purpose": "login",
#         "code_hash": "sd34bn45yhj4edc7yhn9iwsx6yh0ol3e23er876t2e3rt7y6terty",
#         "attempt": 6,
#         "expires_at": "2026-08-11T18:11:00.001639",
#         "created_at": "2026-08-11T18:11:00.001639"
#     }
#
auth.otp.get_all(
    page=1,
    limit=10,
)


# ==========================================================
# QUERY OTP
# ==========================================================
#
# Searches OTP records using the user's identifier.
#
# identifier:
#     The user's email address or phone number.
#
# Matching:
#     Partial matching is supported.
#
# Returns:
#     list[dict]:
#         A list of matching OTP objects.
#
# Pagination:
#     The returned list uses the same pagination behavior
#     as get_all().
#
# Example:
#
auth.otp.query(
    identifier="testuser@example.com",
)