import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlmodel import Session

from model.users import UserDB
from repositories.database import get_session
from services.jwt import JWTService

SessionDep = Annotated[Session, Depends(get_session)]

from repositories.users import UserRepository  # noqa: E402

UserRepositoryDep = Annotated[UserRepository, Depends(UserRepository)]

from services.users import UserService, UserServiceInterface  # noqa: E402

UserServiceDep = Annotated[UserServiceInterface, Depends(UserService)]

from repositories.roles import RoleRepository  # noqa: E402

RoleRepositoryDep = Annotated[RoleRepository, Depends(RoleRepository)]

from services.roles import RoleService, RoleServiceInterface  # noqa: E402

RoleServiceDep = Annotated[RoleServiceInterface, Depends(RoleService)]

from repositories.permissions import PermissionRepository  # noqa: E402

PermissionRepositoryDep = Annotated[PermissionRepository, Depends(PermissionRepository)]

from services.permissions import PermissionService, PermissionServiceInterface  # noqa: E402

PermissionServiceDep = Annotated[PermissionServiceInterface, Depends(PermissionService)]

from repositories.bugs import BugRepository  # noqa: E402

BugRepositoryDep = Annotated[BugRepository, Depends(BugRepository)]

from services.bugs import BugService, BugServiceInterface  # noqa: E402

BugServiceDep = Annotated[BugServiceInterface, Depends(BugService)]


def get_jwt_service() -> JWTService:
    secret = os.getenv(
        "JWT_SECRET_KEY",
        "qastudio-super-secret-jwt-key-2026-hs256",
    )
    return JWTService(secret)


JWTServiceDep = Annotated[JWTService, Depends(get_jwt_service)]


def get_current_user(
    jwt_service: JWTServiceDep,
    repo: UserRepositoryDep,
    authorization: Annotated[str | None, Header()] = None,
) -> UserDB | None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ")
    payload = jwt_service.decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = repo.get_by_email(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


CurrentUserDep = Annotated[UserDB, Depends(get_current_user)]


def get_current_user_id(request: Request, repo: UserRepositoryDep) -> int:
    # El JWT ya fue validado por JWTAuthMW, que guarda el payload en request.state.
    payload = getattr(request.state, "jwt_payload", None)
    if payload is None:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    user = repo.get_by_email(payload["sub"])
    if not user or user.id is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user.id


CurrentUserIdDep = Annotated[int, Depends(get_current_user_id)]
