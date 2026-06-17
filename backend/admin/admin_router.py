from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db
from envelope import success
from admin.admin_auth import get_admin_user
from admin.admin_models import AdminUser
import admin.admin_schemas as aschemas
import admin.admin_service as aservice
import models
import csv, io

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Auth ──────────────────────────────────────────────────────

@router.post("/login")
def admin_login(
    payload: aschemas.AdminLoginRequest,
    db: Session = Depends(get_db)
):
    return success(aservice.admin_login(db, payload))


# ── Dashboard ─────────────────────────────────────────────────

@router.get("/dashboard")
def admin_dashboard(
    db: Session      = Depends(get_db),
    admin: AdminUser = Depends(get_admin_user)
):
    return success(aservice.get_admin_dashboard(db))


# ── Users ─────────────────────────────────────────────────────

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


# ── User Import (MUST be before /{user_id} routes) ───────────

@router.post("/users/import/preview")
async def preview_user_import(
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_admin_user)
):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows   = []
    valid  = 0
    invalid = 0

    for i, row in enumerate(reader, 1):
        is_valid = all(
            str(row.get(c, "")).strip()
            for c in ["name", "login_id", "email"]
        )
        if is_valid:
            valid += 1
        else:
            invalid += 1
        rows.append({
            "row_number": i,
            "name":       row.get("name", "").strip(),
            "login_id":   row.get("login_id", "").strip(),
            "email":      row.get("email", "").strip(),
            "department": row.get("department", "").strip(),
            "is_valid":   is_valid,
            "error":      None if is_valid else "Missing required fields (name, login_id, email)"
        })

    return success({
        "total_rows":     len(rows),
        "valid_count":    valid,
        "invalid_count":  invalid,
        "duplicate_count": 0,
        "valid_records":  [r for r in rows if r["is_valid"]],
        "rows":           rows
    })


@router.post("/users/import/confirm")
def confirm_user_import(
    payload: dict,
    db: Session      = Depends(get_db),
    admin: AdminUser = Depends(get_admin_user)
):
    from auth import hash_password
    from decimal import Decimal

    records  = payload.get("records", [])
    imported = 0
    skipped  = 0

    for r in records:
        exists = db.query(models.User).filter(
            models.User.login_id == r.get("login_id")
        ).first()
        if exists:
            skipped += 1
            continue

        user = models.User(
            login_id      = r["login_id"],
            name          = r["name"],
            email         = r["email"],
            password_hash = hash_password("12345678"),
            role          = "student"
        )
        db.add(user)
        db.flush()

        wallet = models.Wallet(
            user_id = user.id,
            balance = Decimal("0.00")
        )
        db.add(wallet)
        imported += 1

    db.commit()
    return success({
        "imported": imported,
        "skipped":  skipped,
        "message":  f"{imported} user(s) imported, {skipped} skipped (duplicates)."
    })


@router.get("/users/import/history")
def import_history(
    page:      int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50, alias="pageSize"),
    admin: AdminUser = Depends(get_admin_user)
):
    # Placeholder — extend with a DB table later
    return success({"history": [], "total": 0, "page": page, "page_size": page_size})


# ── User Detail & Status (AFTER import routes) ────────────────

@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    db:      Session     = Depends(get_db),
    admin:   AdminUser   = Depends(get_admin_user)
):
    return success(aservice.admin_get_user_detail(db, user_id))


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    payload: aschemas.AdminUserStatusUpdate,
    db:      Session     = Depends(get_db),
    admin:   AdminUser   = Depends(get_admin_user)
):
    return success(aservice.admin_toggle_user_status(
        db, user_id, payload.is_active, admin
    ))


# ── Items ─────────────────────────────────────────────────────

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
    db:      Session     = Depends(get_db),
    admin:   AdminUser   = Depends(get_admin_user)
):
    return success(aservice.admin_get_item_detail(db, item_id))


@router.delete("/items/{item_id}")
def delete_item(
    item_id: str,
    db:      Session     = Depends(get_db),
    admin:   AdminUser   = Depends(get_admin_user)
):
    return success(aservice.admin_delete_item(db, item_id, admin))


@router.patch("/items/{item_id}/restore")
def restore_item(
    item_id: str,
    db:      Session     = Depends(get_db),
    admin:   AdminUser   = Depends(get_admin_user)
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found.")
    item.status = models.ItemStatus.available
    db.commit()
    return success({"item_id": item_id, "message": "Listing restored to available."})


@router.patch("/items/{item_id}/flag")
def flag_item(
    item_id: str,
    admin:   AdminUser = Depends(get_admin_user)
):
    return success({"item_id": item_id, "message": "Flag feature not yet implemented."})


# ── Purchases / Holdings ──────────────────────────────────────

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


# ── Notifications ─────────────────────────────────────────────

@router.post("/notifications")
def send_notification(
    payload: aschemas.AdminSendNotificationRequest,
    db:      Session    = Depends(get_db),
    admin:   AdminUser  = Depends(get_admin_user)
):
    return success(aservice.admin_send_notification(db, payload, admin))


@router.get("/notifications")
def get_notifications(
    page:      int       = Query(default=1,  ge=1),
    page_size: int       = Query(default=20, ge=1, le=100, alias="pageSize"),
    db:        Session   = Depends(get_db),
    admin:     AdminUser = Depends(get_admin_user)
):
    return success(aservice.admin_get_notifications(db, page, page_size))


# ── Reports ───────────────────────────────────────────────────

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


# ── Support Requests ──────────────────────────────────────────

@router.get("/support-requests")
def list_support_requests(
    page:      int           = Query(default=1,  ge=1),
    page_size: int           = Query(default=20, ge=1, le=100, alias="pageSize"),
    status:    Optional[str] = Query(default=None),
    admin:     AdminUser     = Depends(get_admin_user)
):
    return success({"requests": [], "total": 0,
                    "message": "Support requests not yet implemented."})


@router.patch("/support-requests/{req_id}/respond")
def respond_support(
    req_id:  str,
    payload: dict,
    admin:   AdminUser = Depends(get_admin_user)
):
    return success({"req_id": req_id,
                    "message": "Support response not yet implemented."})


# ── Activity Logs ─────────────────────────────────────────────

@router.get("/activity-logs")
def get_activity_logs(
    page:      int       = Query(default=1,  ge=1),
    page_size: int       = Query(default=20, ge=1, le=100, alias="pageSize"),
    db:        Session   = Depends(get_db),
    admin:     AdminUser = Depends(get_admin_user)
):
    return success(aservice.admin_get_activity_logs(db, page, page_size))