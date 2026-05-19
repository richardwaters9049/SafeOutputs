from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class Decision(StrEnum):
    APPROVED = "approved"
    REVIEW_REQUIRED = "review_required"
    BLOCKED = "blocked"


class FileKind(StrEnum):
    TABLE = "table"
    DOCUMENT = "document"
    IMAGE = "image"
    CODE = "code"
    OTHER = "other"


class OutputSubmission(BaseModel):
    researcher_id: str = Field(min_length=3, examples=["res-2048"])
    project_id: str = Field(min_length=3, examples=["ukb-heart-imaging"])
    file_name: str = Field(min_length=3, examples=["aggregate_results.csv"])
    file_kind: FileKind = FileKind.TABLE
    preview_text: str = Field(min_length=1, max_length=20_000)
    declared_rows: int = Field(ge=0, default=0)
    declared_columns: int = Field(ge=0, default=0)


class CheckFinding(BaseModel):
    check_id: str
    title: str
    severity: int = Field(ge=0, le=100)
    evidence: str
    recommendation: str


class Assessment(BaseModel):
    assessment_id: str = Field(default_factory=lambda: f"asm-{uuid4().hex[:12]}")
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submission: OutputSubmission
    risk_score: int = Field(ge=0, le=100)
    decision: Decision
    findings: list[CheckFinding]

