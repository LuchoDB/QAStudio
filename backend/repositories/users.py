from collections.abc import Sequence
from typing import Annotated

from fastapi import Query
from sqlmodel import col, select

from dependencies import SessionDep
from model.roles import ADMIN_ROLE, TESTER_ROLE, Role
from model.users import Country, User, UserDB
from utils.hash import hash_password


class UserRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def fetch_countries(self) -> Sequence[Country]:
        statement = select(Country)
        return self.session.exec(statement).all()

    def count_users(self) -> int:
        return len(self.session.exec(select(UserDB.id)).all())

    def fetch_users(
        self,
        offset: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
    ) -> Sequence[UserDB]:
        statement = select(UserDB).offset(offset).limit(limit)
        result = self.session.exec(statement)
        return result.all()

    def create_user(self, user_base: User) -> UserDB:
        hashed_pwd = hash_password(user_base.password)
        # Si no hay usuarios en la base de datos, el primer usuario registrado es ADMIN por defecto.
        # Los siguientes usuarios reciben el rol TESTER y un ADMIN puede darles ADMIN luego.
        is_first_user = self.session.exec(select(UserDB)).first() is None
        target_role_name = ADMIN_ROLE if is_first_user else TESTER_ROLE
        initial_role = self.session.exec(
            select(Role).where(col(Role.name) == target_role_name)
        ).first()

        user = UserDB(
            name=user_base.name,
            age=user_base.age,
            email=user_base.email,
            password=hashed_pwd,
            country_id=user_base.country_id,
            roles=[initial_role] if initial_role else [],
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> UserDB | None:
        return self.session.get(UserDB, user_id)

    def get_by_email(self, email: str) -> UserDB | None:
        statement = select(UserDB).where(col(UserDB.email) == email)
        return self.session.exec(statement).first()

    def search_by_name(self, name: str) -> Sequence[UserDB]:
        statement = select(UserDB).where(col(UserDB.name).like(f"%{name}%"))
        return self.session.exec(statement).all()

    def fetch_senior_testers(self) -> Sequence[UserDB]:
        statement = select(UserDB).where(UserDB.age >= 25)
        return self.session.exec(statement).all()

    def delete_user(self, user_id: int) -> None:
        user = self.session.get(UserDB, user_id)
        if user:
            self.session.delete(user)
            self.session.commit()

    def update_user(self, user_id: int, user: User) -> UserDB | None:
        user_db = self.session.get(UserDB, user_id)
        if user_db:
            user_db.age = user.age
            user_db.name = user.name
            user_db.country_id = user.country_id
            self.session.add(user_db)
            self.session.commit()
            self.session.refresh(user_db)
        return user_db

    def add_role(self, user: UserDB, role: Role) -> UserDB:
        if role not in user.roles:
            user.roles.append(role)
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
        return user

    def remove_role(self, user: UserDB, role: Role) -> UserDB:
        if role in user.roles:
            user.roles.remove(role)
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
        return user
