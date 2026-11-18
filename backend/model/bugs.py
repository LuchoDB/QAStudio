from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from model.users import UserDB


# Nivel de negocio
class BugBase(SQLModel):
    title: str = Field(index=True)
    description: str
    module: str = Field(index=True)
    severity: int = Field(ge=1, le=5, default=3)
    is_resolved: bool = Field(default=False)
    reporter_id: int | None = Field(default=None, foreign_key="userdb.id")


# Nivel de base de datos
class BugReport(BugBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    reporter: "UserDB" = Relationship(back_populates="reported_bugs")
