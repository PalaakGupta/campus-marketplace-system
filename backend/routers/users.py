from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
import services
from db import get_db
from auth import get_current_user, require_admin
from envelope import success

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", status_code=201)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin)
):
    user = services.create_user(db, payload)
    return success(schemas.UserResponse.model_validate(user).model_dump())


@router.post("/login")
def login(
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    result = services.login(db, payload)
    return success(result)


@router.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = services.change_password(db, current_user, payload)
    return success(result)


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return success(
        schemas.UserResponse.model_validate(current_user).model_dump()
    )


@router.get("/{user_id}")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    user = services.get_user_by_id(db, user_id)
    return success(schemas.UserResponse.model_validate(user).model_dump())