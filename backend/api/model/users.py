from pydantic import EmailStr
from sqlmodel import SQLModel

from api.model.roles import RoleResponse
from model.users import CountryBase


class CreateUserRequest(SQLModel):
    name: str
    age: int
    country_id: int | None = None
    email: EmailStr
    password: str


class CreateUserResponse(SQLModel):
    id: int


class CountryResponse(CountryBase):
    id: int


class GetUsersResponse(SQLModel):
    id: int
    name: str
    age: int | None = None
    roles: list[RoleResponse] = []


class DeleteUserResponse(SQLModel):
    msg: str


class GetUserResponseWithCountry(GetUsersResponse):
    age: int
    email: str
    country: CountryResponse | None = None
    roles: list[RoleResponse] = []
