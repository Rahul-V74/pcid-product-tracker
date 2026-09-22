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


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# Auth endpoints
@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_users = await session.execute(select(func.count(User.id)))
    is_first_user = existing_users.scalar_one() == 0
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_superuser=is_first_user,
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
    query = select(PCIDRecord)
    count_query = select(func.count(PCIDRecord.id))

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
    total = await session.execute(select(func.count(PCIDRecord.id)))
    ip_count = await session.execute(select(func.count(PCIDRecord.id)).where(PCIDRecord.status == "IP"))
    completed_count = await session.execute(select(func.count(PCIDRecord.id)).where(PCIDRecord.status == "Completed"))
    hold_count = await session.execute(select(func.count(PCIDRecord.id)).where(PCIDRecord.status == "HOLD"))

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
    result = await session.execute(select(PCIDRecord).where(PCIDRecord.id == record_id))
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
    result = await session.execute(select(PCIDRecord).where(PCIDRecord.id == record_id))
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
    result = await session.execute(select(PCIDRecord).where(PCIDRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await session.delete(record)
    await session.commit()


@router.delete("/records", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_records(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin),
):
    await session.execute(sa_delete(PCIDRecord))
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

    query = select(PCIDRecord)
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
            "Designer Name": r.designer_name or "",
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
        excel_file = pd.ExcelFile(io.BytesIO(content))
        sheet_name = "Co-ords" if "Co-ords" in excel_file.sheet_names else excel_file.sheet_names[0]
        df = excel_file.parse(sheet_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")

    customer_id_column = next((c for c in ("Customer ID", "Customer #") if c in df.columns), None)
    if customer_id_column is None:
        raise HTTPException(status_code=400, detail="Missing required column: Customer ID (or Customer #)")
    if "PCID" not in df.columns:
        raise HTTPException(status_code=400, detail="Missing required column: PCID")

    delivery_date_column = next((c for c in ("Delivery Date", "Completion Date") if c in df.columns), None)
    designer_name_column = "Designer Name" if "Designer Name" in df.columns else None

    success = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            if pd.isna(row.get(customer_id_column)) or pd.isna(row.get("PCID")):
                continue

            delivery_val = row.get(delivery_date_column) if delivery_date_column else None
            parsed_date = None
            if pd.notna(delivery_val):
                ts = pd.to_datetime(delivery_val)
                parsed_date = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else ts

            designer_name = None
            if designer_name_column and pd.notna(row.get(designer_name_column)):
                designer_name = str(row[designer_name_column]).strip()

            record_data = {
                "owner_id": current_user.id,
                "customer_id": str(row[customer_id_column]).strip(),
                "pcid": str(row["PCID"]).strip(),
                "designer_name": designer_name,
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
