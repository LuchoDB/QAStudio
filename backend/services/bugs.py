from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Annotated

from fastapi import Query

from dependencies import BugRepositoryDep
from model.bugs import BugBase, BugReport


class BugServiceInterface(ABC):
    @abstractmethod
    def get_bugs(self, offset: int, limit: int) -> Sequence[BugReport]: ...

    @abstractmethod
    def create_bug(self, bug: BugBase) -> BugReport: ...

    @abstractmethod
    def get_bug_by_id(self, bug_id: int) -> BugReport | None: ...

    @abstractmethod
    def search_bugs(self, title: str) -> Sequence[BugReport]: ...

    @abstractmethod
    def search_critical_open(self) -> Sequence[BugReport]: ...

    @abstractmethod
    def update_bug(self, bug_id: int, bug: BugBase) -> BugReport | None: ...

    @abstractmethod
    def delete_bug(self, bug_id: int) -> None: ...


class BugService(BugServiceInterface):
    def __init__(self, repo: BugRepositoryDep):
        self.repo = repo

    def get_bugs(
        self,
        offset: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
    ) -> Sequence[BugReport]:
        return self.repo.fetch_bugs(offset, limit)

    def create_bug(self, bug: BugBase) -> BugReport:
        return self.repo.create_bug(bug)

    def get_bug_by_id(self, bug_id: int) -> BugReport | None:
        return self.repo.get_by_id(bug_id)

    def search_bugs(self, title: str) -> Sequence[BugReport]:
        return self.repo.search_by_title(title)

    def search_critical_open(self) -> Sequence[BugReport]:
        return self.repo.fetch_critical_open()

    def update_bug(self, bug_id: int, bug: BugBase) -> BugReport | None:
        return self.repo.update_bug(bug_id, bug)

    def delete_bug(self, bug_id: int) -> None:
        self.repo.delete_bug(bug_id)
