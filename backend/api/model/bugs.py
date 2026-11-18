from pydantic import Field
from sqlmodel import SQLModel

from api.model.users import GetUsersResponse


class CreateBugRequest(SQLModel):
    title: str
    description: str
    module: str
    severity: int = Field(default=3, ge=1, le=5)
    is_resolved: bool = False


class CreateBugResponse(SQLModel):
    id: int


class GetBugsResponse(SQLModel):
    id: int
    title: str
    module: str
    severity: int
    is_resolved: bool


class GetBugDetailResponse(GetBugsResponse):
    description: str
    reporter_id: int | None = None
    reporter: GetUsersResponse | None = None


class DeleteBugResponse(SQLModel):
    msg: str
