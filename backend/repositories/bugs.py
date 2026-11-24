from collections.abc import Sequence
from typing import Annotated

from fastapi import Query
from sqlmodel import col, select

from dependencies import SessionDep
from model.bugs import BugBase, BugReport


class BugRepository:
    def __init__(self, session: SessionDep):
        self.session = session

    def fetch_bugs(
        self,
        offset: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
    ) -> Sequence[BugReport]:
        statement = select(BugReport).offset(offset).limit(limit)
        return self.session.exec(statement).all()

    def create_bug(self, bug_base: BugBase) -> BugReport:
        bug = BugReport(
            title=bug_base.title,
            description=bug_base.description,
            project=bug_base.project,
            module=bug_base.module,
            severity=bug_base.severity,
            is_resolved=bug_base.is_resolved,
            reporter_id=bug_base.reporter_id,
        )
        self.session.add(bug)
        self.session.commit()
        self.session.refresh(bug)
        return bug

    def get_by_id(self, bug_id: int) -> BugReport | None:
        return self.session.get(BugReport, bug_id)

    def search_by_title(self, title: str) -> Sequence[BugReport]:
        statement = select(BugReport).where(col(BugReport.title).like(f"%{title}%"))
        return self.session.exec(statement).all()

    def fetch_critical_open(self) -> Sequence[BugReport]:
        statement = select(BugReport).where(
            BugReport.severity >= 4,
            BugReport.is_resolved == False,  # noqa: E712
        )
        return self.session.exec(statement).all()

    def update_bug(self, bug_id: int, bug_base: BugBase) -> BugReport | None:
        bug_db = self.session.get(BugReport, bug_id)
        if bug_db:
            bug_db.title = bug_base.title
            bug_db.description = bug_base.description
            bug_db.project = bug_base.project
            bug_db.module = bug_base.module
            bug_db.severity = bug_base.severity
            bug_db.is_resolved = bug_base.is_resolved
            self.session.add(bug_db)
            self.session.commit()
            self.session.refresh(bug_db)
        return bug_db

    def delete_bug(self, bug_id: int) -> None:
        bug_db = self.session.get(BugReport, bug_id)
        if bug_db:
            self.session.delete(bug_db)
            self.session.commit()
