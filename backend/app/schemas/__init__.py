from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


class PCIDRecordBase(BaseModel):
    customer_id: str
    pcid: str
    designer_name: Optional[str] = None
    delivery_date: Optional[datetime] = None
    status: str = "IP"
    remarks: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ["IP", "Completed", "HOLD"]
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


class PCIDRecordCreate(PCIDRecordBase):
    pass


class PCIDRecordUpdate(BaseModel):
    customer_id: Optional[str] = None
    pcid: Optional[str] = None
    designer_name: Optional[str] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = ["IP", "Completed", "HOLD"]
            if v not in allowed:
                raise ValueError(f"Status must be one of {allowed}")
        return v


class PCIDRecordRead(PCIDRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PCIDRecordList(BaseModel):
    records: list[PCIDRecordRead]
    total: int
    page: int
    page_size: int


class SummaryStats(BaseModel):
    total_records: int
    ip_count: int
    completed_count: int
    hold_count: int


class ImportResult(BaseModel):
    success: int
    errors: list[dict]
    message: str


class ExportRequest(BaseModel):
    status_filter: Optional[str] = None
    search: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserRead(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None