from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import datetime
from fastapi import HTTPException, status
from passlib.context import CryptContext
from jose import jwt
import os
import bcrypt
import models
from admin.admin_models import (
    AdminUser, UserReport, AdminActivityLog,
    ReportStatus, AdminActivityType
)
import admin.admin_schemas as aschemas

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_SECRET  = os.getenv("ADMIN_JWT_SECRET", "admin-secret-change-in-prod")
ALGORITHM     = "HS256"
TOKEN_MINUTES = 480


#  Auth helpers 



def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def _verify_pw(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _make_token(admin_id: str, role: str) -> str:
    from datetime import timedelta
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_MINUTES)
    return jwt.encode(
        {"sub": admin_id, "role": role, "exp": expire, "iss": "admin"},
        ADMIN_SECRET, algorithm=ALGORITHM
    )


def decode_admin_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, ADMIN_SECRET, algorithms=[ALGORITHM])
        if payload.get("iss") != "admin":
            raise ValueError("Not an admin token")
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid admin token."}
        )


#  Seed first admin 

def seed_admin(db: Session, admin_id: str, name: str,
               email: str, password: str) -> AdminUser:
    existing = db.query(AdminUser).filter(
        AdminUser.admin_id == admin_id
    ).first()
    if existing:
        return existing
    admin = AdminUser(
        admin_id=admin_id, name=name, email=email,
        password_hash=_hash_pw(password)
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


#  Login 

def admin_login(db: Session,
                payload: aschemas.AdminLoginRequest) -> dict:
    admin = db.query(AdminUser).filter(
        AdminUser.admin_id == payload.admin_id
    ).first()

    if not admin or not _verify_pw(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED",
                    "message": "Invalid admin ID or password."}
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN",
                    "message": "Admin account is deactivated."}
        )

    admin.last_login_at = datetime.utcnow()
    db.commit()

    _log(db, admin.id, AdminActivityType.login)

    return {
        "access_token": _make_token(admin.id, admin.role),
        "token_type":   "bearer",
        "admin_id":     admin.id,
        "name":         admin.name,
        "role":         admin.role,
    }


#  Dashboard Stats 

def get_admin_dashboard(db: Session) -> dict:
    today = datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    total_users   = db.query(func.count(models.User.id)).scalar() or 0
    active_users  = db.query(func.count(models.User.id)).filter(
        models.User.is_active == True
    ).scalar() or 0

    total_listings   = db.query(func.count(models.Item.id)).scalar() or 0
    active_listings  = db.query(func.count(models.Item.id)).filter(
        models.Item.status == models.ItemStatus.available
    ).scalar() or 0
    sold_listings    = db.query(func.count(models.Item.id)).filter(
        models.Item.status == models.ItemStatus.sold
    ).scalar() or 0

    total_purchases  = db.query(func.count(models.HoldingRecord.id)).scalar() or 0
    active_holdings  = db.query(func.count(models.HoldingRecord.id)).filter(
        models.HoldingRecord.status == models.HoldingStatus.holding
    ).scalar() or 0

    wallet_sum = db.query(func.sum(models.Wallet.balance)).scalar() or 0
    held_sum   = db.query(func.sum(models.HoldingRecord.amount)).filter(
        models.HoldingRecord.status == models.HoldingStatus.holding
    ).scalar() or 0

    unread_reports = db.query(func.count(UserReport.id)).filter(
        UserReport.status == ReportStatus.pending
    ).scalar() or 0

    new_users_today = db.query(func.count(models.User.id)).filter(
        models.User.created_at >= today
    ).scalar() or 0
    sales_today = db.query(func.count(models.HoldingRecord.id)).filter(
        models.HoldingRecord.status   == models.HoldingStatus.released,
        models.HoldingRecord.released_at >= today
    ).scalar() or 0

    return {
        "total_users":           int(total_users),
        "active_users":          int(active_users),
        "total_listings":        int(total_listings),
        "active_listings":       int(active_listings),
        "sold_listings":         int(sold_listings),
        "total_purchases":       int(total_purchases),
        "active_vault_holdings": int(active_holdings),
        "total_wallet_balance":  float(wallet_sum),
        "total_held_amount":     float(held_sum),
        "unread_reports":        int(unread_reports),
        "new_users_today":       int(new_users_today),
        "sales_today":           int(sales_today),
    }


#  User Management 

def admin_list_users(db: Session, page: int = 1,
                     page_size: int = 20, search: str = None,
                     role: str = None,
                     is_active: bool = None) -> dict:
    q = db.query(models.User)
    if search:
        like = f"%{search}%"
        q = q.filter(
            models.User.name.ilike(like)     |
            models.User.login_id.ilike(like) |
            models.User.email.ilike(like)
        )
    if role and role != "all":
        q = q.filter(models.User.role == role)
    if is_active is not None:
        q = q.filter(models.User.is_active == is_active)

    total  = q.count()
    offset = (page - 1) * page_size
    users  = q.order_by(models.User.created_at.desc()).offset(offset).limit(page_size).all()

    result = []
    for u in users:
        bal = float(u.wallet.balance) if u.wallet else 0.0
        lc  = db.query(func.count(models.Item.id)).filter(
            models.Item.seller_id == u.id
        ).scalar() or 0
        pc  = db.query(func.count(models.HoldingRecord.id)).filter(
            models.HoldingRecord.buyer_id == u.id
        ).scalar() or 0
        result.append({
            "id": u.id, "login_id": u.login_id, "name": u.name,
            "email": u.email, "role": u.role,
            "is_active": u.is_active, "is_verified": u.is_verified,
            "wallet_balance": bal, "listing_count": int(lc),
            "purchase_count": int(pc),
            "created_at": u.created_at.isoformat(),
        })

    return {
        "users": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


def admin_get_user_detail(db: Session, user_id: str) -> dict:
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "User not found."})

    bal   = float(u.wallet.balance) if u.wallet else 0.0
    held  = db.query(func.sum(models.HoldingRecord.amount)).filter(
        models.HoldingRecord.buyer_id == u.id,
        models.HoldingRecord.status   == models.HoldingStatus.holding
    ).scalar() or 0
    lc    = db.query(func.count(models.Item.id)).filter(
        models.Item.seller_id == u.id
    ).scalar() or 0
    pc    = db.query(func.count(models.HoldingRecord.id)).filter(
        models.HoldingRecord.buyer_id == u.id
    ).scalar() or 0
    sc    = db.query(func.count(models.HoldingRecord.id)).filter(
        models.HoldingRecord.seller_id == u.id,
        models.HoldingRecord.status    == models.HoldingStatus.released
    ).scalar() or 0

    return {
        "id": u.id, "login_id": u.login_id, "name": u.name,
        "email": u.email, "role": u.role,
        "is_active": u.is_active, "is_verified": u.is_verified,
        "wallet_balance": bal, "held_balance": float(held),
        "listing_count": int(lc), "purchase_count": int(pc),
        "sales_count": int(sc),
        "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
        "created_at": u.created_at.isoformat(),
    }


def admin_toggle_user_status(db: Session, user_id: str,
                              new_active: bool,
                              admin: AdminUser) -> dict:
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "User not found."})

    u.is_active = new_active
    db.commit()

    action = (AdminActivityType.user_activated if new_active
              else AdminActivityType.user_deactivated)
    _log(db, admin.id, action, target_id=user_id, target_type="user",
         note=f"User {'activated' if new_active else 'deactivated'}: {u.name}")

    return {
        "user_id":   user_id,
        "is_active": u.is_active,
        "message":   f"User {'activated' if new_active else 'deactivated'} successfully.",
    }


# Listing Management 

def admin_list_items(db: Session, page: int = 1,
                     page_size: int = 20, status_filter: str = None,
                     search: str = None) -> dict:
    q = db.query(models.Item)
    if search:
        q = q.filter(models.Item.title.ilike(f"%{search}%"))
    if status_filter and status_filter != "all":
        q = q.filter(models.Item.status == status_filter.lower())

    total  = q.count()
    offset = (page - 1) * page_size
    items  = q.order_by(models.Item.created_at.desc()).offset(offset).limit(page_size).all()

    result = []
    for it in items:
        sname = it.seller.name if it.seller else "Unknown"
        result.append({
            "id": it.id, "title": it.title,
            "price": float(it.price), "status": it.status,
            "listing_channel": it.listing_channel,
            "category": it.category, "seller_id": it.seller_id,
            "seller_name": sname, "view_count": it.view_count,
            "created_at": it.created_at.isoformat(),
        })

    return {
        "listings": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


def admin_get_item_detail(db: Session, item_id: str) -> dict:
    it = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not it:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "Listing not found."})
    seller = it.seller
    return {
        "id": it.id, "title": it.title,
        "description": it.description,
        "price": float(it.price), "status": it.status,
        "listing_channel": it.listing_channel,
        "category": it.category,
        "condition_grade": it.condition_grade,
        "seller_id": it.seller_id,
        "seller_name": seller.name if seller else "Unknown",
        "seller_email": seller.email if seller else "",
        "view_count": it.view_count,
        "created_at": it.created_at.isoformat(),
    }


def admin_delete_item(db: Session, item_id: str,
                      admin: AdminUser) -> dict:
    it = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not it:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "Listing not found."})

    active_hold = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.item_id == item_id,
        models.HoldingRecord.status  == models.HoldingStatus.holding
    ).first()
    if active_hold:
        raise HTTPException(status_code=400,
                            detail={"code": "ACTIVE_HOLD",
                                    "message": "Cannot delete listing with active vault hold."})

    db.delete(it)
    db.commit()

    _log(db, admin.id, AdminActivityType.listing_removed,
         target_id=item_id, target_type="item",
         note=f"Listing removed: {it.title}")

    return {"item_id": item_id, "message": "Listing removed successfully."}


#  Transaction Management 

def admin_list_purchases(db: Session, page: int = 1,
                          page_size: int = 20,
                          status_filter: str = None) -> dict:
    q = db.query(models.HoldingRecord)
    if status_filter and status_filter != "all":
        q = q.filter(models.HoldingRecord.status == status_filter.lower())

    total  = q.count()
    offset = (page - 1) * page_size
    rows   = q.order_by(
        models.HoldingRecord.created_at.desc()
    ).offset(offset).limit(page_size).all()

    result = []
    for h in rows:
        item   = db.query(models.Item).filter(models.Item.id == h.item_id).first()
        buyer  = db.query(models.User).filter(models.User.id == h.buyer_id).first()
        seller = db.query(models.User).filter(models.User.id == h.seller_id).first()
        result.append({
            "holding_id":  h.id,
            "item_id":     h.item_id,
            "item_title":  item.title if item else "Unknown",
            "buyer_id":    h.buyer_id,
            "buyer_name":  buyer.name if buyer else "Unknown",
            "seller_id":   h.seller_id,
            "seller_name": seller.name if seller else "Unknown",
            "amount":      float(h.amount),
            "status":      h.status,
            "created_at":  h.created_at.isoformat(),
            "released_at": h.released_at.isoformat() if h.released_at else None,
            "refunded_at": h.refunded_at.isoformat() if h.refunded_at else None,
        })

    return {
        "purchases": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


def admin_list_transactions(db: Session, page: int = 1,
                             page_size: int = 20,
                             tx_type: str = None) -> dict:
    q = db.query(models.Transaction)
    if tx_type and tx_type != "all":
        q = q.filter(models.Transaction.transaction_type == tx_type.lower())

    total  = q.count()
    offset = (page - 1) * page_size
    rows   = q.order_by(
        models.Transaction.created_at.desc()
    ).offset(offset).limit(page_size).all()

    result = []
    for tx in rows:
        from_u  = tx.from_user
        to_u    = tx.to_user
        item_t  = None
        if tx.holding_record and tx.holding_record.item:
            item_t = tx.holding_record.item.title
        result.append({
            "id":               tx.id,
            "holding_id":       tx.holding_record_id,
            "from_user_id":     tx.from_user_id,
            "from_user_name":   from_u.name if from_u else "Unknown",
            "to_user_id":       tx.to_user_id,
            "to_user_name":     to_u.name if to_u else "Unknown",
            "amount":           float(tx.amount),
            "transaction_type": tx.transaction_type,
            "item_title":       item_t,
            "created_at":       tx.created_at.isoformat(),
        })

    return {
        "transactions": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


def admin_issue_refund(db: Session, holding_id: str,
                        reason: str, admin: AdminUser) -> dict:
    h = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.id == holding_id
    ).first()
    if not h:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "Holding record not found."})
    if h.status != models.HoldingStatus.holding:
        raise HTTPException(status_code=409,
                            detail={"code": "INVALID_STATUS",
                                    "message": f"Cannot refund — status is '{h.status}'."})

    buyer_wallet = db.query(models.Wallet).filter(
        models.Wallet.user_id == h.buyer_id
    ).first()
    if not buyer_wallet:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "Buyer wallet not found."})

    buyer_wallet.balance += Decimal(str(h.amount))
    h.status      = models.HoldingStatus.refunded
    h.refunded_at = datetime.utcnow()

    item = db.query(models.Item).filter(models.Item.id == h.item_id).first()
    if item:
        item.status = models.ItemStatus.available

    refund_tx = models.Transaction(
        holding_record_id=h.id,
        from_user_id=h.seller_id,
        to_user_id=h.buyer_id,
        amount=h.amount,
        transaction_type=models.TransactionType.refund,
    )
    db.add(refund_tx)
    db.commit()

    _log(db, admin.id, AdminActivityType.refund_issued,
         target_id=holding_id, target_type="holding",
         note=f"Refund ₹{h.amount} to buyer {h.buyer_id}. Reason: {reason}")

    return {
        "holding_id":      holding_id,
        "amount_refunded": float(h.amount),
        "buyer_id":        h.buyer_id,
        "message":         "Refund issued successfully.",
    }


#  Notification Management 

def admin_send_notification(db: Session,
                             payload: aschemas.AdminSendNotificationRequest,
                             admin: AdminUser) -> dict:
    if payload.recipient_id:
        user = db.query(models.User).filter(
            models.User.id == payload.recipient_id
        ).first()
        if not user:
            raise HTTPException(status_code=404,
                                detail={"code": "NOT_FOUND",
                                        "message": "Recipient user not found."})
        recipients = [user]
    else:
        recipients = db.query(models.User).filter(
            models.User.is_active == True
        ).all()

    count = 0
    for u in recipients:
        notif = models.Notification(
            recipient_id=u.id,
            notification_type=models.NotificationType.new_message,
            title=payload.title,
            message=payload.message_body,
        )
        db.add(notif)
        count += 1

    db.commit()

    _log(db, admin.id, AdminActivityType.notification_sent,
         note=f"Sent '{payload.title}' to {count} user(s).")

    return {
        "sent_count": count,
        "message":    f"Notification sent to {count} user(s).",
    }


def admin_get_notifications(db: Session,
                             page: int = 1,
                             page_size: int = 20) -> dict:
    """
    Returns the most recent system-broadcast notifications sent by admin.
    These are notifications WITHOUT a related_item_id (system-wide).
    """
    q = (
        db.query(models.Notification)
        .filter(models.Notification.related_item_id == None)
        .order_by(models.Notification.created_at.desc())
    )
    total  = q.count()
    offset = (page - 1) * page_size
    rows   = q.offset(offset).limit(page_size).all()

    result = []
    for n in rows:
        result.append({
            "id":             n.id,
            "recipient_id":   n.recipient_id,
            "recipient_name": n.recipient.name if n.recipient else "Unknown",
            "title":          n.title,
            "message_body":   n.message,
            "sent_at":        n.created_at.isoformat(),
            "sent_by_name":   "Admin",
        })

    return {
        "notifications": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


#  Reports Management 

def admin_list_reports(db: Session, page: int = 1,
                        page_size: int = 20,
                        status_filter: str = None,
                        category: str = None) -> dict:
    q = db.query(UserReport)
    if status_filter and status_filter != "all":
        q = q.filter(UserReport.status == status_filter.lower())
    if category and category != "all":
        q = q.filter(UserReport.category == category.lower())

    total  = q.count()
    offset = (page - 1) * page_size
    rows   = q.order_by(
        UserReport.created_at.desc()
    ).offset(offset).limit(page_size).all()

    result = []
    for r in rows:
        reporter = db.query(models.User).filter(
            models.User.id == r.reporter_id
        ).first()
        rep_user_name = None
        rep_item_title = None
        if r.reported_user_id:
            ru = db.query(models.User).filter(
                models.User.id == r.reported_user_id
            ).first()
            rep_user_name = ru.name if ru else "Unknown"
        if r.reported_item_id:
            ri = db.query(models.Item).filter(
                models.Item.id == r.reported_item_id
            ).first()
            rep_item_title = ri.title if ri else "Unknown"

        result.append({
            "id":                   r.id,
            "reporter_id":          r.reporter_id,
            "reporter_name":        reporter.name if reporter else "Unknown",
            "target_type":          r.target_type,
            "reported_user_id":     r.reported_user_id,
            "reported_user_name":   rep_user_name,
            "reported_item_id":     r.reported_item_id,
            "reported_item_title":  rep_item_title,
            "category":             r.category,
            "description":          r.description,
            "status":               r.status,
            "created_at":           r.created_at.isoformat(),
            "resolved_at":          r.resolved_at.isoformat() if r.resolved_at else None,
            "resolution_note":      r.resolution_note,
        })

    return {
        "reports": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


def admin_resolve_report(db: Session, report_id: str,
                          payload: aschemas.AdminResolveReportRequest,
                          admin: AdminUser) -> dict:
    r = db.query(UserReport).filter(UserReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404,
                            detail={"code": "NOT_FOUND",
                                    "message": "Report not found."})
    if r.status != ReportStatus.pending:
        raise HTTPException(status_code=409,
                            detail={"code": "ALREADY_RESOLVED",
                                    "message": "Report is already resolved."})

    valid_actions = ["resolved", "dismissed"]
    if payload.action not in valid_actions:
        raise HTTPException(status_code=400,
                            detail={"code": "INVALID_ACTION",
                                    "message": f"Action must be one of: {valid_actions}"})

    r.status          = ReportStatus(payload.action)
    r.resolution_note = payload.resolution_note
    r.resolved_by_id  = admin.id
    r.resolved_at     = datetime.utcnow()
    db.commit()

    _log(db, admin.id, AdminActivityType.report_resolved,
         target_id=report_id, target_type="report",
         note=f"Report {payload.action}: {payload.resolution_note or ''}")

    return {
        "report_id":       report_id,
        "new_status":      r.status,
        "resolution_note": r.resolution_note,
        "message":         f"Report marked as {payload.action}.",
    }


#  Activity Logs 

def admin_get_activity_logs(db: Session, page: int = 1,
                             page_size: int = 20) -> dict:
    q = db.query(AdminActivityLog).order_by(
        AdminActivityLog.created_at.desc()
    )
    total  = q.count()
    offset = (page - 1) * page_size
    rows   = q.offset(offset).limit(page_size).all()

    result = []
    for log in rows:
        result.append({
            "id":            log.id,
            "admin_name":    log.admin.name if log.admin else "Unknown",
            "activity_type": log.activity_type,
            "target_id":     log.target_id,
            "target_type":   log.target_type,
            "note":          log.note,
            "created_at":    log.created_at.isoformat(),
        })

    return {
        "logs": result, "total": total,
        "page": page, "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


#  Internal log helper 

def _log(db: Session, admin_id: str,
         activity_type: AdminActivityType,
         target_id: str = None,
         target_type: str = None,
         note: str = None):
    entry = AdminActivityLog(
        admin_id=admin_id,
        activity_type=activity_type,
        target_id=target_id,
        target_type=target_type,
        note=note,
    )
    db.add(entry)
    db.commit()