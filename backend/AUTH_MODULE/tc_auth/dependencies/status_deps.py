from fastapi import Depends
from ..exceptions.error import PermissionDeniedError


class StatusDeps:
    def __init__(self, auth_deps):
        self.auth_deps = auth_deps

    def require(
        self,
        status: str,
    ):
        def dependency(
            user: dict = Depends(
                self.auth_deps.get_current
            ),
        ):
            if user["status"] != status:
                raise PermissionDeniedError(
                    user["status"],
                    status,
                )

            return user

        return dependency

    def allow(
        self,
        *statuses: str,
    ):
        def dependency(
            user: dict = Depends(
                self.auth_deps.get_current
            ),
        ):
            if user["status"] not in statuses:
                raise PermissionDeniedError(
                    user["status"],
                    statuses,
                )

            return user

        return dependency

    def block(
        self,
        *statuses: str,
    ):
        def dependency(
            user: dict = Depends(
                self.auth_deps.get_current
            ),
        ):
            if user["status"] in statuses:
                raise PermissionDeniedError(
                    user["status"],
                    statuses,
                )

            return user

        return dependency