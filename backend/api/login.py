from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from api.model.login import Login, LoginResponse, RegisterRequest, SetupStatusResponse
from api.model.users import CountryResponse, CreateUserResponse
from dependencies import JWTServiceDep, UserServiceDep
from model.users import Country, User, UserDB
from services.login import LoginService

router = APIRouter(tags=["Auth"])
LoginServiceDep = Annotated[LoginService, Depends(LoginService)]


@router.get("/auth/setup-status", response_model=SetupStatusResponse)
def get_setup_status(user_service: UserServiceDep) -> SetupStatusResponse:
    return SetupStatusResponse(has_users=user_service.has_any_users())


@router.post("/login", response_model=LoginResponse)
def login(req: Login, service: LoginServiceDep, jwt_service: JWTServiceDep) -> LoginResponse:
    valid = service.login(req.email, req.password)
    if not valid:
        raise HTTPException(status_code=401, detail="User/password incorrect")

    return LoginResponse(msg="ok", token=jwt_service.create_access_token({"sub": req.email}))


@router.post("/register", response_model=CreateUserResponse, status_code=201)
def register(req: RegisterRequest, user_service: UserServiceDep) -> UserDB:
    if len(req.password) < 4:
        raise HTTPException(status_code=422, detail="Password must have at least 4 characters")
    if user_service.get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=req.name,
        age=req.age,
        email=req.email,
        password=req.password,
        country_id=req.country_id,
    )
    return user_service.create_user(user)


@router.get("/country", response_model=Sequence[CountryResponse])
def get_countries(user_service: UserServiceDep) -> Sequence[Country]:
    return user_service.get_countries()
