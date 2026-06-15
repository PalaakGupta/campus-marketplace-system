import uuid
import enum
from sqlalchemy import (
    Column, String, Text, Boolean,
    DateTime, Enum, ForeignKey, Integer
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base


def _gen_uuid():
    return str(uuid.uuid4())


#  Enums 
class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    moderator   = "moderator"


class ReportCategory(str, enum.Enum):
    scam            = "scam"
    inappropriate   = "inappropriate"
    fake_listing    = "fake_listing"
    harassment      = "harassment"
    other           = "other"


class ReportStatus(str, enum.Enum):
    pending  = "pending"
    resolved = "resolved"
    dismissed = "dismissed"


class ReportTargetType(str, enum.Enum):
    user    = "user"
    listing = "listing"


class AdminActivityType(str, enum.Enum):
    login             = "login"
    user_deactivated  = "user_deactivated"
    user_activated    = "user_activated"
    listing_removed   = "listing_removed"
    report_resolved   = "report_resolved"
    report_dismissed  = "report_dismissed"
    notification_sent = "notification_sent"
    refund_issued     = "refund_issued"


#  AdminUser 

class AdminUser(Base):
    """
    Separate admin account table.
    Completely isolated from marketplace users table.
    Admin credentials never mix with campus user credentials.
    """
    __tablename__ = "admin_users"

    id            = Column(String(36), primary_key=True, default=_gen_uuid)
    admin_id      = Column(String(50), nullable=False, unique=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(AdminRole), nullable=False,
                           default=AdminRole.moderator)
    is_active     = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at    = Column(DateTime, server_default=func.now(),
                           onupdate=func.now(), nullable=False)

    activity_logs = relationship(
        "AdminActivityLog", back_populates="admin",
        cascade="all, delete-orphan"
    )


#  UserReport 

class UserReport(Base):
    """
    Reports filed by marketplace users about other users or listings.
    Admins review and resolve these.
    reporter_id and reported_user_id reference the marketplace users table.
    reported_item_id references the items table.
    """
    __tablename__ = "user_reports"

    id                 = Column(String(36), primary_key=True, default=_gen_uuid)
    reporter_id        = Column(String(36), nullable=False, index=True)
    target_type        = Column(Enum(ReportTargetType), nullable=False)
    reported_user_id   = Column(String(36), nullable=True)
    reported_item_id   = Column(String(36), nullable=True)
    category           = Column(Enum(ReportCategory), nullable=False)
    description        = Column(Text, nullable=False)
    status             = Column(Enum(ReportStatus), nullable=False,
                                default=ReportStatus.pending)
    resolved_by_id     = Column(String(36),
                                ForeignKey("admin_users.id",
                                           ondelete="SET NULL"),
                                nullable=True)
    resolution_note    = Column(Text, nullable=True)
    created_at         = Column(DateTime, server_default=func.now(),
                                nullable=False)
    resolved_at        = Column(DateTime, nullable=True)

    resolved_by = relationship("AdminUser", foreign_keys=[resolved_by_id])


# AdminActivityLog 

class AdminActivityLog(Base):
    """
    Immutable audit trail of every admin action.
    Every state-changing admin action must write a log entry.
    """
    __tablename__ = "admin_activity_logs"

    id            = Column(String(36), primary_key=True, default=_gen_uuid)
    admin_id      = Column(String(36),
                           ForeignKey("admin_users.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    activity_type = Column(Enum(AdminActivityType), nullable=False)
    target_id     = Column(String(36), nullable=True)
    target_type   = Column(String(50), nullable=True)
    note          = Column(Text, nullable=True)
    created_at    = Column(DateTime, server_default=func.now(), nullable=False)

    admin = relationship("AdminUser", back_populates="activity_logs")