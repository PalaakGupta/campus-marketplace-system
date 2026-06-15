from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db
from envelope import success
from admin.admin_auth import get_admin_user
from admin.admin_models import AdminUser
import admin.admin_schemas as aschemas
import admin.admin_service as aservice

router = APIRouter(prefix="/admin", tags=["Admin"])


#  Auth 

@router.post("/login")
def admin_login(
    payload: aschemas.AdminLoginRequest,
    db: Session = Depends(get_db)
):
    return success(aservice.admin_login(db, payload))


# ─ Dashboard 

@router.get("/dashboard")
def admin_dashboard(
    db: Session     = Depends(get_db),
    admin: AdminUser = Depends(get_admin_user)
):
    return success(aservice.get_admin_dashboard(db))


#  Users 

@router.get("/users")
def list_users(
    page:      int            = Query(default=1,  ge=1),
    page_size: int            = Query(default=20, ge=1, le=100, alias="pageSize"),
    search:    Optional[str]  = Query(default=None),
    role:      Optional[str]  = Query(default=None),
    is_active: Optional[bool] = Query(default=None, alias="isActive"),
    db:        Session        = Depends(get_db),
    admin:     AdminUser      = Depends(get_admin_user)
):
    return success(aservice.admin_list_users(
        db, page, page_size, search, role, is_active
    ))


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_get_user_detail(db, user_id))


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    payload: aschemas.AdminUserStatusUpdate,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_toggle_user_status(
        db, user_id, payload.is_active, admin
    ))


#  Items 

@router.get("/items")
def list_items(
    page:          int           = Query(default=1,  ge=1),
    page_size:     int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    search:        Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db:            Session       = Depends(get_db),
    admin:         AdminUser     = Depends(get_admin_user)
):
    return success(aservice.admin_list_items(
        db, page, page_size, status_filter, search
    ))


@router.get("/items/{item_id}")
def get_item_detail(
    item_id: str,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_get_item_detail(db, item_id))


@router.delete("/items/{item_id}")
def delete_item(
    item_id: str,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_delete_item(db, item_id, admin))


#  Purchases / Holdings 

@router.get("/purchases")
def list_purchases(
    page:          int           = Query(default=1,  ge=1),
    page_size:     int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db:            Session       = Depends(get_db),
    admin:         AdminUser     = Depends(get_admin_user)
):
    return success(aservice.admin_list_purchases(
        db, page, page_size, status_filter
    ))


@router.get("/holding-transactions")
def list_holding_transactions(
    page:          int           = Query(default=1,  ge=1),
    page_size:     int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db:            Session       = Depends(get_db),
    admin:         AdminUser     = Depends(get_admin_user)
):
    return success(aservice.admin_list_purchases(
        db, page, page_size, status_filter
    ))


@router.get("/wallet-transactions")
def list_wallet_transactions(
    page:      int           = Query(default=1,  ge=1),
    page_size: int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    tx_type:   Optional[str] = Query(default=None, alias="type"),
    db:        Session       = Depends(get_db),
    admin:     AdminUser     = Depends(get_admin_user)
):
    return success(aservice.admin_list_transactions(
        db, page, page_size, tx_type
    ))


@router.post("/holding-transactions/{holding_id}/refund")
def issue_refund(
    holding_id: str,
    payload:    aschemas.AdminRefundRequest,
    db:         Session    = Depends(get_db),
    admin:      AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_issue_refund(
        db, holding_id, payload.reason, admin
    ))


#  Notifications 

@router.post("/notifications")
def send_notification(
    payload: aschemas.AdminSendNotificationRequest,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_send_notification(db, payload, admin))


@router.get("/notifications")
def get_notifications(
    page:      int     = Query(default=1,  ge=1),
    page_size: int     = Query(default=20, ge=1, le=100, alias="pageSize"),
    db:        Session = Depends(get_db),
    admin:     AdminUser = Depends(get_admin_user)
):
    return success(aservice.admin_get_notifications(db, page, page_size))


#  Reports 

@router.get("/reports")
def list_reports(
    page:          int           = Query(default=1,  ge=1),
    page_size:     int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category:      Optional[str] = Query(default=None),
    db:            Session       = Depends(get_db),
    admin:         AdminUser     = Depends(get_admin_user)
):
    return success(aservice.admin_list_reports(
        db, page, page_size, status_filter, category
    ))


@router.patch("/reports/{report_id}/resolve")
def resolve_report(
    report_id: str,
    payload:   aschemas.AdminResolveReportRequest,
    db:        Session    = Depends(get_db),
    admin:     AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_resolve_report(
        db, report_id, payload, admin
    ))


#  Activity Logs 

@router.get("/activity-logs")
def get_activity_logs(
    page:      int     = Query(default=1,  ge=1),
    page_size: int     = Query(default=20, ge=1, le=100, alias="pageSize"),
    db:        Session = Depends(get_db),
    admin:     AdminUser = Depends(get_admin_user)
):
    return success(aservice.admin_get_activity_logs(db, page, page_size))