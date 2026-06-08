from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
import services
from db import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post(
    "/",
    response_model=schemas.UserResponse,
    status_code=201,
    summary="Admin only — create a student account"
)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    return services.create_user(db, payload)


@router.post(
    "/login",
    response_model=schemas.LoginResponse,
    summary="Student login with roll number and password"
)
def login(
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    return services.login(db, payload)


@router.post(
    "/change-password",
    summary="Student changes their own password"
)
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db)
):
    return services.change_password(db, payload)


@router.get(
    "/{user_id}",
    response_model=schemas.UserResponse,
    summary="Get a user by ID"
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    return services.get_user_by_id(db, user_id)