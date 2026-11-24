import os

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = os.getenv("DATABASE_URL")
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite").lower()

if DATABASE_URL:
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
elif DB_ENGINE == "sqlite":
    sqlite_file_name = "database.db"
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(sqlite_url, connect_args=connect_args)
elif DB_ENGINE == "postgres":
    pg_url = os.getenv(
        "POSTGRES_URL",
        "postgresql+psycopg://postgres:admin@localhost:5432/qastudio",
    )
    engine = create_engine(pg_url, pool_pre_ping=True)
else:
    raise RuntimeError(f"database engine not supported {DB_ENGINE}, use 'sqlite' or 'postgres'")


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        try:
            conn.execute(
                text(
                    "ALTER TABLE bugreport ADD COLUMN project VARCHAR NOT NULL DEFAULT 'E-Commerce Web'"
                )
            )
        except Exception:
            pass


def get_session():
    with Session(engine) as session:
        yield session
