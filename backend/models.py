import uuid
import enum
from sqlalchemy import (
    Column, String, Text, DECIMAL, Boolean,
    DateTime, Enum, ForeignKey, Integer,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base


def generate_uuid():
    return str(uuid.uuid4())


# Enums

class UserRole(str, enum.Enum):
    admin                = "admin"
    student              = "student"
    professor            = "professor"
    teaching_assistant   = "teaching_assistant"
    lab_staff            = "lab_staff"
    administrative_staff = "administrative_staff"


class ItemStatus(str, enum.Enum):
    available = "available"
    reserved  = "reserved"
    sold      = "sold"


class ListingChannel(str, enum.Enum):
    marketplace  = "marketplace"
    thrift_store = "thrift_store"


class ItemCondition(str, enum.Enum):
    new      = "New"
    like_new = "Like New"
    good     = "Good"
    fair     = "Fair"
    poor     = "Poor"


class HoldingStatus(str, enum.Enum):
    holding  = "holding"
    released = "released"
    refunded = "refunded"


class TransactionType(str, enum.Enum):
    purchase = "purchase"
    release  = "release"
    refund   = "refund"


class NotificationType(str, enum.Enum):
    purchase_received  = "purchase_received"
    delivery_confirmed = "delivery_confirmed"
    payment_released   = "payment_released"
    payment_refunded   = "payment_refunded"
    item_reserved      = "item_reserved"
    new_message        = "new_message"
    listing_sold       = "listing_sold"


# User

class User(Base):
    __tablename__ = "users"

    id            = Column(String(36), primary_key=True,
                           default=generate_uuid)
    login_id      = Column(String(50),  nullable=False, unique=True,
                           index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), nullable=False, unique=True,
                           index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), nullable=False,
                           default=UserRole.student)
    is_active     = Column(Boolean, default=True,  nullable=False)
    is_verified   = Column(Boolean, default=False, nullable=False)
    last_seen_at  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, server_default=func.now(),
                           nullable=False)
    updated_at    = Column(DateTime, server_default=func.now(),
                           onupdate=func.now(), nullable=False)

    wallet        = relationship("Wallet", back_populates="user",
                                 uselist=False)
    items         = relationship("Item", back_populates="seller")
    purchases     = relationship("HoldingRecord",
                                 foreign_keys="HoldingRecord.buyer_id",
                                 back_populates="buyer")
    sales         = relationship("HoldingRecord",
                                 foreign_keys="HoldingRecord.seller_id",
                                 back_populates="seller")
    saved_items   = relationship("SavedItem", back_populates="user",
                                 cascade="all, delete-orphan")
    notifications = relationship("Notification",
                                 back_populates="recipient",
                                 cascade="all, delete-orphan")


# Wallet

class Wallet(Base):
    __tablename__ = "wallets"

    id         = Column(String(36), primary_key=True,
                        default=generate_uuid)
    user_id    = Column(String(36), ForeignKey("users.id"),
                        nullable=False, unique=True)
    balance    = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    created_at = Column(DateTime, server_default=func.now(),
                        nullable=False)
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="wallet")

# Item


class Item(Base):
    __tablename__ = "items"

    id              = Column(String(36), primary_key=True,
                             default=generate_uuid)
    seller_id       = Column(String(36), ForeignKey("users.id"),
                             nullable=False)
    title           = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    price           = Column(DECIMAL(12, 2), nullable=False)
    status          = Column(Enum(ItemStatus), nullable=False,
                             default=ItemStatus.available)
    listing_channel = Column(Enum(ListingChannel), nullable=False,
                             default=ListingChannel.marketplace)
    category        = Column(String(100), nullable=True)
    condition_grade = Column(
    Enum('New', 'Like New', 'Good', 'Fair', 'Poor', name='itemcondition'),
    nullable=True
)
    view_count      = Column(Integer, nullable=False, default=0)
    created_at      = Column(DateTime, server_default=func.now(),
                             nullable=False)
    updated_at      = Column(DateTime, server_default=func.now(),
                             onupdate=func.now(), nullable=False)
    image_url = Column(String(500), nullable=True)
    seller         = relationship("User", back_populates="items")
    holding_record = relationship("HoldingRecord",
                                  back_populates="item", uselist=False)
    saved_by       = relationship("SavedItem", back_populates="item",
                                  cascade="all, delete-orphan")
    messages       = relationship("Message",
                                  foreign_keys="Message.item_id")


# SavedItem

class SavedItem(Base):
    __tablename__ = "saved_items"

    id       = Column(String(36), primary_key=True,
                      default=generate_uuid)
    user_id  = Column(String(36), ForeignKey("users.id"),
                      nullable=False)
    item_id  = Column(String(36), ForeignKey("items.id"),
                      nullable=False)
    saved_at = Column(DateTime, server_default=func.now(),
                      nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "item_id",
                         name="uq_saved_item_user_item"),
    )

    user = relationship("User", back_populates="saved_items")
    item = relationship("Item", back_populates="saved_by")


# HoldingRecord
class HoldingRecord(Base):
    __tablename__ = "holding_records"

    id           = Column(String(36), primary_key=True,
                          default=generate_uuid)
    item_id      = Column(String(36), ForeignKey("items.id"),
                          nullable=False, unique=True)
    buyer_id     = Column(String(36), ForeignKey("users.id"),
                          nullable=False)
    seller_id    = Column(String(36), ForeignKey("users.id"),
                          nullable=False)
    amount       = Column(DECIMAL(12, 2), nullable=False)
    status       = Column(Enum(HoldingStatus), nullable=False,
                          default=HoldingStatus.holding)
    confirmed_at = Column(DateTime, nullable=True)
    released_at  = Column(DateTime, nullable=True)
    refunded_at  = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, server_default=func.now(),
                          nullable=False)
    updated_at   = Column(DateTime, server_default=func.now(),
                          onupdate=func.now(), nullable=False)

    item         = relationship("Item", back_populates="holding_record")
    buyer        = relationship("User", foreign_keys=[buyer_id],
                                back_populates="purchases")
    seller       = relationship("User", foreign_keys=[seller_id],
                                back_populates="sales")
    transactions = relationship("Transaction",
                                back_populates="holding_record")


# Transaction

class Transaction(Base):
    __tablename__ = "transactions"

    id                = Column(String(36), primary_key=True,
                               default=generate_uuid)
    holding_record_id = Column(String(36),
                               ForeignKey("holding_records.id"),
                               nullable=False)
    from_user_id      = Column(String(36), ForeignKey("users.id"),
                               nullable=False)
    to_user_id        = Column(String(36), ForeignKey("users.id"),
                               nullable=False)
    amount            = Column(DECIMAL(12, 2), nullable=False)
    transaction_type  = Column(Enum(TransactionType), nullable=False)
    created_at        = Column(DateTime, server_default=func.now(),
                               nullable=False)

    holding_record = relationship("HoldingRecord",
                                  back_populates="transactions")
    from_user      = relationship("User", foreign_keys=[from_user_id])
    to_user        = relationship("User", foreign_keys=[to_user_id])


# Message


class Message(Base):
    __tablename__ = "messages"

    id         = Column(String(36), primary_key=True,
                        default=generate_uuid)
    item_id    = Column(String(36), ForeignKey("items.id"),
                        nullable=False)
    sender_id  = Column(String(36), ForeignKey("users.id"),
                        nullable=False)
    content    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False, nullable=False)
    read_at    = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(),
                        nullable=False)

    item   = relationship("Item",   foreign_keys=[item_id])
    sender = relationship("User",   foreign_keys=[sender_id])


# Notification


class Notification(Base):
    __tablename__ = "notifications"

    id                 = Column(String(36), primary_key=True,
                                default=generate_uuid)
    recipient_id       = Column(String(36), ForeignKey("users.id"),
                                nullable=False)
    notification_type  = Column(Enum(NotificationType), nullable=False)
    title              = Column(String(200), nullable=False)
    message            = Column(Text, nullable=False)
    is_read            = Column(Boolean, default=False, nullable=False)
    read_at            = Column(DateTime, nullable=True)
    related_item_id    = Column(String(36),
                                ForeignKey("items.id",
                                           ondelete="SET NULL"),
                                nullable=True)
    related_holding_id = Column(String(36), nullable=True)
    created_at         = Column(DateTime, server_default=func.now(),
                                nullable=False)

    recipient    = relationship("User", back_populates="notifications")
    related_item = relationship("Item",
                                foreign_keys=[related_item_id])