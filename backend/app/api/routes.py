from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import select, func
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import io

from app.core.database import get_session
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)
from app.models import PCIDRecord, User
from app.schemas import (
    PCIDRecordCreate,
    PCIDRecordUpdate,
    PCIDRecordRead,
    PCIDRecordList,
    SummaryStats,
    ImportResult,
    ExportRequest,
    UserCreate,
    UserRead,
    Token,
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# Auth dependency
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


# Auth endpoints
@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    email = form_data.username
    password = form_data.password
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


# PCID Records endpoints
@router.get("/records", response_model=PCIDRecordList)
async def list_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query = select(PCIDRecord).where(PCIDRecord.owner_id == current_user.id)
    count_query = select(func.count(PCIDRecord.id)).where(PCIDRecord.owner_id == current_user.id)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (PCIDRecord.customer_id.ilike(search_term))
            | (PCIDRecord.pcid.ilike(search_term))
            | (PCIDRecord.designer_name.ilike(search_term))
        )
        count_query = count_query.where(
            (PCIDRecord.customer_id.ilike(search_term))
            | (PCIDRecord.pcid.ilike(search_term))
            | (PCIDRecord.designer_name.ilike(search_term))
        )

    if status_filter and status_filter != "All":
        query = query.where(PCIDRecord.status == status_filter)
        count_query = count_query.where(PCIDRecord.status == status_filter)

    query = query.order_by(PCIDRecord.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await session.execute(query)
    records = result.scalars().all()

    count_result = await session.execute(count_query)
    total = count_result.scalar_one()

    return {
        "records": records,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/records/summary", response_model=SummaryStats)
async def get_summary(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    owner_filter = PCIDRecord.owner_id == current_user.id
    total = await session.execute(select(func.count(PCIDRecord.id)).where(owner_filter))
    ip_count = await session.execute(select(func.count(PCIDRecord.id)).where(owner_filter, PCIDRecord.status == "IP"))
    completed_count = await session.execute(select(func.count(PCIDRecord.id)).where(owner_filter, PCIDRecord.status == "Completed"))
    hold_count = await session.execute(select(func.count(PCIDRecord.id)).where(owner_filter, PCIDRecord.status == "HOLD"))

    return {
        "total_records": total.scalar_one(),
        "ip_count": ip_count.scalar_one(),
        "completed_count": completed_count.scalar_one(),
        "hold_count": hold_count.scalar_one(),
    }


@router.post("/records", response_model=PCIDRecordRead, status_code=status.HTTP_201_CREATED)
async def create_record(
    record: PCIDRecordCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_record = PCIDRecord(**record.model_dump(), owner_id=current_user.id)
    session.add(db_record)
    await session.commit()
    await session.refresh(db_record)
    return db_record


@router.get("/records/{record_id}", response_model=PCIDRecordRead)
async def get_record(
    record_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(PCIDRecord).where(PCIDRecord.id == record_id, PCIDRecord.owner_id == current_user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.patch("/records/{record_id}", response_model=PCIDRecordRead)
async def update_record(
    record_id: int,
    record_update: PCIDRecordUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(PCIDRecord).where(PCIDRecord.id == record_id, PCIDRecord.owner_id == current_user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = record_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()

    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(PCIDRecord).where(PCIDRecord.id == record_id, PCIDRecord.owner_id == current_user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await session.delete(record)
    await session.commit()


@router.delete("/records", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_records(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await session.execute(sa_delete(PCIDRecord).where(PCIDRecord.owner_id == current_user.id))
    await session.commit()


# Export endpoint
@router.post("/export")
async def export_records(
    export_request: ExportRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    status_filter = export_request.status_filter
    search = export_request.search

    query = select(PCIDRecord).where(PCIDRecord.owner_id == current_user.id)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (PCIDRecord.customer_id.ilike(search_term))
            | (PCIDRecord.pcid.ilike(search_term))
            | (PCIDRecord.designer_name.ilike(search_term))
        )
    if status_filter and status_filter != "All":
        query = query.where(PCIDRecord.status == status_filter)

    query = query.order_by(PCIDRecord.created_at.desc())
    result = await session.execute(query)
    records = result.scalars().all()

    data = []
    for i, r in enumerate(records, 1):
        data.append({
            "S.No": i,
            "Customer ID": r.customer_id,
            "PCID": r.pcid,
            "Designer Name": r.designer_name,
            "Delivery Date": r.delivery_date.strftime("%Y-%m-%d") if r.delivery_date else "",
            "Status": r.status,
            "Remarks": r.remarks or "",
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="PCID Records")
    output.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=pcid_records.xlsx"},
    )


# Import endpoint
@router.post("/import", response_model=ImportResult)
async def import_records(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be Excel format (.xlsx or .xls)")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")

    required_columns = ["Customer ID", "PCID", "Designer Name"]
    for col in required_columns:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    success = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            delivery_val = row.get("Delivery Date")
            parsed_date = None
            if pd.notna(delivery_val):
                ts = pd.to_datetime(delivery_val)
                parsed_date = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts

            record_data = {
                "owner_id": current_user.id,
                "customer_id": str(row["Customer ID"]).strip(),
                "pcid": str(row["PCID"]).strip(),
                "designer_name": str(row["Designer Name"]).strip(),
                "delivery_date": parsed_date,
                "status": str(row.get("Status", "IP")).strip() if pd.notna(row.get("Status")) else "IP",
                "remarks": str(row.get("Remarks", "")).strip() if pd.notna(row.get("Remarks")) else None,
            }

            if record_data["status"] not in ["IP", "Completed", "HOLD"]:
                record_data["status"] = "IP"

            record = PCIDRecord(**record_data)
            session.add(record)
            success += 1
        except Exception as e:
            errors.append({"row": idx + 2, "error": str(e)})

    await session.commit()

    return {
        "success": success,
        "errors": errors,
        "message": f"Successfully imported {success} records. {len(errors)} errors." if errors else f"Successfully imported {success} records.",
    }
