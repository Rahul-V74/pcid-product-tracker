from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column, DateTime
from sqlalchemy import func

# Re-export SQLModel so alembic/env.py can do: from app.models import SQLModel
__all__ = ["SQLModel", "PCIDRecord", "User"]


class PCIDRecord(SQLModel, table=True):
    __tablename__ = "pcid_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="users.id", index=True)
    customer_id: str = Field(index=True, max_length=100)
    pcid: str = Field(index=True, max_length=100)
    designer_name: Optional[str] = Field(default=None, max_length=100)
    delivery_date: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    status: str = Field(default="IP", max_length=20)
    remarks: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
