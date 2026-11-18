from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer

from api.middlewares.protected import protected
from api.model.users import (
    CreateUserRequest,
    CreateUserResponse,
    DeleteUserResponse,
    GetUserResponseWithCountry,
    GetUsersResponse,
)
from dependencies import CurrentUserIdDep, RoleServiceDep, UserServiceDep
from model.users import User, UserDB

router = APIRouter(tags=["Users"], dependencies=[Depends(HTTPBearer())])


def permission_check(p: str):
    def check(service: UserServiceDep, me_id: CurrentUserIdDep):
        me = service.get_user_by_id(me_id)
        if not me:
            raise HTTPException(status_code=401, detail="User not logged in")

        access = False
        for role in me.roles:
            for permission in role.permissions:
                if permission.name == p:
                    access = True

        if not access:
            raise HTTPException(status_code=403, detail=f"Missing permission: {p}")

    return check


@router.post(
    "/user",
    response_model=CreateUserResponse,
    dependencies=[Depends(permission_check("write_users"))],
)
@protected
def create_user(req: CreateUserRequest, service: UserServiceDep) -> UserDB:
    if len(req.password) < 4:
        raise HTTPException(status_code=422, detail="Password must have at least 4 characters")
    if service.get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=req.name,
        age=req.age,
        email=req.email,
        password=req.password,
        country_id=req.country_id,
    )
    return service.create_user(user)


@router.get(
    "/user",
    response_model=Sequence[GetUsersResponse],
    dependencies=[Depends(permission_check("read_users"))],
)
@protected
def get_users_endpoint(
    service: UserServiceDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[UserDB]:
    return service.get_users(offset, limit)


@router.get(
    "/user/{user_id}",
    response_model=GetUserResponseWithCountry,
    dependencies=[Depends(permission_check("read_users"))],
)
@protected
def get_user_by_id(user_id: int, service: UserServiceDep) -> UserDB:
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get(
    "/user/search/{name}",
    response_model=Sequence[GetUsersResponse],
    dependencies=[Depends(permission_check("read_users"))],
)
@protected
def search_user(name: str, service: UserServiceDep) -> Sequence[UserDB]:
    return service.search_users(name)


@router.get(
    "/user/me/id",
    dependencies=[Depends(permission_check("read_users"))],
)
@protected
def get_my_id(me_id: CurrentUserIdDep) -> dict[str, int]:
    return {"id": me_id}


@router.get(
    "/user/filter/seniors",
    response_model=Sequence[GetUsersResponse],
    dependencies=[Depends(permission_check("read_users"))],
)
@protected
def get_senior_testers(service: UserServiceDep) -> Sequence[UserDB]:
    return service.search_senior_testers()


@router.delete(
    "/user/{user_id}",
    response_model=DeleteUserResponse,
    dependencies=[Depends(permission_check("delete_users"))],
)
@protected
def delete_user(user_id: int, service: UserServiceDep) -> DeleteUserResponse:
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service.delete_user(user_id)
    return DeleteUserResponse(msg="Usuario borrado con éxito")


@router.patch(
    "/user/{user_id}",
    response_model=CreateUserResponse,
    dependencies=[Depends(permission_check("update_users"))],
)
@protected
def update_user(user_id: int, req: CreateUserRequest, service: UserServiceDep) -> UserDB | None:
    user = User(
        name=req.name,
        email=req.email,
        password=req.password,
        age=req.age,
        country_id=req.country_id,
    )
    res = service.update_user(user_id, user)
    if res:
        return res

    raise HTTPException(status_code=404, detail="User not found")


@router.post(
    "/user/{user_id}/role/{role_id}",
    response_model=GetUserResponseWithCountry,
    dependencies=[Depends(permission_check("write_users"))],
)
@protected
def add_role_to_user(
    user_id: int,
    role_id: int,
    service: UserServiceDep,
    role_service: RoleServiceDep,
) -> UserDB:
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return service.add_role(user, role)


@router.delete(
    "/user/{user_id}/role/{role_id}",
    response_model=GetUserResponseWithCountry,
    dependencies=[Depends(permission_check("update_users"))],
)
@protected
def remove_role_from_user(
    user_id: int,
    role_id: int,
    service: UserServiceDep,
    role_service: RoleServiceDep,
) -> UserDB:
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = role_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return service.remove_role(user, role)
