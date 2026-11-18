import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from api import bugs, login, permissions, roles, users
from api.middlewares.auth import JWTAuthMW
from api.middlewares.counter import CounterMW
from repositories import database
from repositories.database import create_db_and_tables
from repositories.seed import seed_catalog_and_roles

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

jwtAuthMW = JWTAuthMW()

app = FastAPI(title="QA Studio API", dependencies=[Depends(jwtAuthMW.check_jwt)])
app.include_router(users.router)
app.include_router(login.router)
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(bugs.router)

counterMW = CounterMW()


@app.middleware("http")
async def middle_ware_prueba(request: Request, call_next):
    return await counterMW.middle_ware_prueba(request, call_next)


# Registrado último para que sea el middleware más externo y responda los preflight OPTIONS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
)


def init_catalog_and_roles() -> None:
    with Session(database.engine) as session:
        seed_catalog_and_roles(session)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    init_catalog_and_roles()
