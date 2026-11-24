from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer

from api.middlewares.protected import protected
from api.model.bugs import (
    CreateBugRequest,
    CreateBugResponse,
    DeleteBugResponse,
    GetBugDetailResponse,
    GetBugsResponse,
)
from api.users import permission_check
from dependencies import BugServiceDep, CurrentUserIdDep
from model.bugs import BugBase, BugReport

router = APIRouter(tags=["Bugs"], dependencies=[Depends(HTTPBearer())])


@router.post(
    "/bug",
    response_model=CreateBugResponse,
    status_code=201,
    dependencies=[Depends(permission_check("write_bugs"))],
)
@protected
def create_bug(
    req: CreateBugRequest,
    service: BugServiceDep,
    me_id: CurrentUserIdDep,
) -> BugReport:
    bug = BugBase(
        title=req.title,
        description=req.description,
        project=req.project,
        module=req.module,
        severity=req.severity,
        is_resolved=req.is_resolved,
        reporter_id=me_id,
    )
    return service.create_bug(bug)


@router.get(
    "/bug",
    response_model=Sequence[GetBugsResponse],
    dependencies=[Depends(permission_check("read_bugs"))],
)
@protected
def get_bugs(
    service: BugServiceDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
) -> Sequence[BugReport]:
    return service.get_bugs(offset, limit)


@router.get(
    "/bug/filter/critical",
    response_model=Sequence[GetBugsResponse],
    dependencies=[Depends(permission_check("read_bugs"))],
)
@protected
def get_critical_bugs(service: BugServiceDep) -> Sequence[BugReport]:
    return service.search_critical_open()


@router.get(
    "/bug/search/{title}",
    response_model=Sequence[GetBugsResponse],
    dependencies=[Depends(permission_check("read_bugs"))],
)
@protected
def search_bugs(title: str, service: BugServiceDep) -> Sequence[BugReport]:
    return service.search_bugs(title)


@router.get(
    "/bug/{bug_id}",
    response_model=GetBugDetailResponse,
    dependencies=[Depends(permission_check("read_bugs"))],
)
@protected
def get_bug_by_id(bug_id: int, service: BugServiceDep) -> BugReport:
    bug = service.get_bug_by_id(bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")
    return bug


@router.patch(
    "/bug/{bug_id}",
    response_model=CreateBugResponse,
    dependencies=[Depends(permission_check("update_bugs"))],
)
@protected
def update_bug(bug_id: int, req: CreateBugRequest, service: BugServiceDep) -> BugReport:
    bug = BugBase(
        title=req.title,
        description=req.description,
        project=req.project,
        module=req.module,
        severity=req.severity,
        is_resolved=req.is_resolved,
    )
    res = service.update_bug(bug_id, bug)
    if not res:
        raise HTTPException(status_code=404, detail="Bug not found")
    return res


@router.delete(
    "/bug/{bug_id}",
    response_model=DeleteBugResponse,
    dependencies=[Depends(permission_check("delete_bugs"))],
)
@protected
def delete_bug(bug_id: int, service: BugServiceDep) -> DeleteBugResponse:
    if not service.get_bug_by_id(bug_id):
        raise HTTPException(status_code=404, detail="Bug not found")
    service.delete_bug(bug_id)
    return DeleteBugResponse(msg="Bug borrado con éxito")
