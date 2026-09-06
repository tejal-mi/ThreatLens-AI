from fastapi import Depends

from ..exceptions.error import PermissionDeniedError


class RoleDeps:
    def __init__(self, auth_deps):
        self.auth_deps = auth_deps

    def require(
        self,
        role: str,
    ):
        def dependency(
            current=Depends(self.auth_deps.get_current),
        ):
            user = current["account"]

            if user["role"] != role:
                raise PermissionDeniedError(
                    user["role"],
                    role,
                )

            return user

        return dependency

    def allow(
        self,
        *roles: str,
    ):
        def dependency(
            current=Depends(self.auth_deps.get_current),
        ):
            user = current["account"]

            if user["role"] not in roles:
                raise PermissionDeniedError(
                    user["role"],
                    roles,
                )

            return user

        return dependency

    def block(
        self,
        *roles: str,
    ):
        def dependency(
            current=Depends(self.auth_deps.get_current),
        ):
            user = current["account"]

            if user["role"] in roles:
                raise PermissionDeniedError(
                    user["role"],
                    roles,
                )

            return user

        return dependency