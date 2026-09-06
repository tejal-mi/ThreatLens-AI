# tc_auth

`tc_auth` is a Python authentication module designed for FastAPI applications.
It provides reusable services for account management, login/signup flows, session handling, OTP verification, and OAuth login integrations.

## What this code includes

- **Auth bootstrap class** (`tc_auth/auth.py`) to wire services, dependencies, and exception handlers.
- **Database models** (`tc_auth/db/models.py`) for accounts, sessions, OTP records, and OAuth-linked accounts.
- **Core services** (`tc_auth/service/`) for authentication, account operations, sessions, OTP, OAuth, and user lookup.
- **Dependency helpers** (`tc_auth/dependencies/`) to retrieve current user/session and enforce role/status checks.
- **OAuth adapters** (`tc_auth/oauth/`) for Google and GitHub login flows.
- **JWT utilities and exception handling** for token generation/verification and auth-specific errors.

## Typical usage

Create an `Auth` instance with your SQLAlchemy engine and FastAPI app, then use exposed services/dependencies in your routes.
