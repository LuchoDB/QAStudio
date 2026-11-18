from typing import TYPE_CHECKING

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from model.roles import Role, UserRole

if TYPE_CHECKING:
    from model.bugs import BugReport


# Nivel de negocio
class CountryBase(SQLModel):
    name: str = Field(index=True)


# Nivel de base de datos
class Country(CountryBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    users: list["UserDB"] = Relationship(back_populates="country")


# Nivel de negocio
class User(SQLModel):
    name: str = Field(index=True)
    age: int
    country_id: int | None = Field(default=None, foreign_key="country.id")
    password: str = Field(max_length=72, min_length=4)
    email: EmailStr = Field(unique=True, index=True)


# Nivel de base de datos
class UserDB(User, table=True):
    id: int | None = Field(default=None, primary_key=True)
    country: Country | None = Relationship(back_populates="users")
    roles: list[Role] = Relationship(back_populates="users", link_model=UserRole)
    reported_bugs: list["BugReport"] = Relationship(back_populates="reporter")
