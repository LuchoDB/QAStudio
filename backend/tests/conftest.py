import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from repositories.database import get_session
from repositories.seed import seed_catalog_and_roles


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(name="seed")
def seed_fixture(session: Session):
    # Inicializa únicamente catálogos (Country, Role, Permission) sin ningún usuario precreado
    seed_catalog_and_roles(session)


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(client: TestClient, seed):
    # El primer usuario que se registra en el sistema recibe automáticamente el rol ADMIN
    client.post(
        "/register",
        json={
            "name": "Lead QA Admin",
            "age": 30,
            "country_id": 1,
            "email": "admin@qastudio.com",
            "password": "adminpassword",
        },
    )
    res = client.post(
        "/login",
        json={"email": "admin@qastudio.com", "password": "adminpassword"},
    )
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture(name="auth_headers_regular")
def auth_headers_regular_fixture(client: TestClient, auth_headers):
    # Como ya existe el primer usuario ADMIN, el segundo usuario registrado recibe el rol TESTER
    client.post(
        "/register",
        json={
            "name": "QA Tester Uno",
            "age": 24,
            "country_id": 2,
            "email": "tester@qastudio.com",
            "password": "testerpassword",
        },
    )
    res = client.post(
        "/login",
        json={"email": "tester@qastudio.com", "password": "testerpassword"},
    )
    return {"Authorization": f"Bearer {res.json()['token']}"}
