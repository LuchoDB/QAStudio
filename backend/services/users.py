from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Annotated

from fastapi import Query

from dependencies import UserRepositoryDep
from model.roles import Role
from model.users import Country, User, UserDB


class UserServiceInterface(ABC):
    @abstractmethod
    def get_countries(self) -> Sequence[Country]: ...

    @abstractmethod
    def has_any_users(self) -> bool: ...

    @abstractmethod
    def get_users(self, offset: int, limit: int) -> Sequence[UserDB]: ...

    @abstractmethod
    def create_user(self, user: User) -> UserDB: ...

    @abstractmethod
    def get_user_by_id(self, user_id: int) -> UserDB | None: ...

    @abstractmethod
    def get_user_by_email(self, email: str) -> UserDB | None: ...

    @abstractmethod
    def search_users(self, name: str) -> Sequence[UserDB]: ...

    @abstractmethod
    def search_senior_testers(self) -> Sequence[UserDB]: ...

    @abstractmethod
    def delete_user(self, user_id: int) -> None: ...

    @abstractmethod
    def update_user(self, user_id: int, user: User) -> UserDB | None: ...

    @abstractmethod
    def add_role(self, user: UserDB, role: Role) -> UserDB: ...

    @abstractmethod
    def remove_role(self, user: UserDB, role: Role) -> UserDB: ...


class UserService(UserServiceInterface):
    def __init__(self, repo: UserRepositoryDep):
        self.repo = repo

    def get_countries(self) -> Sequence[Country]:
        return self.repo.fetch_countries()

    def has_any_users(self) -> bool:
        return self.repo.count_users() > 0

    def get_users(
        self,
        offset: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
    ) -> Sequence[UserDB]:
        return self.repo.fetch_users(offset, limit)

    def create_user(self, user: User) -> UserDB:
        return self.repo.create_user(user)

    def get_user_by_id(self, user_id: int) -> UserDB | None:
        return self.repo.get_by_id(user_id)

    def get_user_by_email(self, email: str) -> UserDB | None:
        return self.repo.get_by_email(email)

    def search_users(self, name: str) -> Sequence[UserDB]:
        return self.repo.search_by_name(name)

    def search_senior_testers(self) -> Sequence[UserDB]:
        return self.repo.fetch_senior_testers()

    def delete_user(self, user_id: int) -> None:
        self.repo.delete_user(user_id)

    def update_user(self, user_id: int, user: User) -> UserDB | None:
        return self.repo.update_user(user_id, user=user)

    def add_role(self, user: UserDB, role: Role) -> UserDB:
        return self.repo.add_role(user, role)

    def remove_role(self, user: UserDB, role: Role) -> UserDB:
        return self.repo.remove_role(user, role)
