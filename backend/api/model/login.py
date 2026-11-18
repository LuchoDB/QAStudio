from pydantic import EmailStr
from sqlmodel import SQLModel


class Login(SQLModel):
    email: EmailStr
    password: str


class LoginResponse(SQLModel):
    msg: str
    token: str


class RegisterRequest(SQLModel):
    name: str
    age: int
    country_id: int | None = None
    email: EmailStr
    password: str


class SetupStatusResponse(SQLModel):
    has_users: bool
