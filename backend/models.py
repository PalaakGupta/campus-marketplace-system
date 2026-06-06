from sqlalchemy import (
    Column, Integer, String, Text,
    DECIMAL, Boolean, DateTime,
    Enum, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base
import enum

# Python Enums — single source of truth for allowed values

class ItemStatus(str, enum.Enum):
    available = "available"
    reserved  = "reserved"
    sold      = "sold"


class ListingChannel(str, enum.Enum):
    marketplace  = "marketplace"
    thrift_store = "thrift_store"


class HoldingStatus(str, enum.Enum):
    holding  = "holding"
    released = "released"
    refunded = "refunded"


class TransactionType(str, enum.Enum):
    purchase = "purchase"
    release  = "release"
    refund   = "refund"

# MODEL: User

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at    = Column(DateTime, server_default=func.now(),
                           onupdate=func.now(), nullable=False)

    # Relationships
    wallet                  = relationship("Wallet", back_populates="user",
                                           uselist=False)
    items                   = relationship("Item", back_populates="seller")
    purchases               = relationship("HoldingRecord",
                                           foreign_keys="HoldingRecord.buyer_id",
                                           back_populates="buyer")
    sales                   = relationship("HoldingRecord",
                                           foreign_keys="HoldingRecord.seller_id",
                                           back_populates="seller")


# MODEL: Wallet

class Wallet(Base):
    __tablename__ = "wallets"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    balance    = Column(DECIMAL(12, 2), nullable=False, default=0.00)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="wallet")

# MODEL: Item


class Item(Base):
    __tablename__ = "items"

    id              = Column(Integer, primary_key=True, index=True)
    seller_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    title           = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    price           = Column(DECIMAL(12, 2), nullable=False)
    status          = Column(Enum(ItemStatus), nullable=False,
                             default=ItemStatus.available)
    listing_channel = Column(Enum(ListingChannel), nullable=False,
                             default=ListingChannel.marketplace)
    category        = Column(String(100), nullable=True)
    created_at      = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at      = Column(DateTime, server_default=func.now(),
                             onupdate=func.now(), nullable=False)
    messages = relationship("Message", foreign_keys="Message.item_id")

    # Relationships
    seller         = relationship("User", back_populates="items")
    holding_record = relationship("HoldingRecord", back_populates="item",
                                  uselist=False)


# MODEL: HoldingRecord

class HoldingRecord(Base):
    __tablename__ = "holding_records"

    id         = Column(Integer, primary_key=True, index=True)
    item_id    = Column(Integer, ForeignKey("items.id"),
                        nullable=False, unique=True)
    buyer_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount     = Column(DECIMAL(12, 2), nullable=False)
    status     = Column(Enum(HoldingStatus), nullable=False,
                        default=HoldingStatus.holding)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Relationships
    item         = relationship("Item", back_populates="holding_record")
    buyer        = relationship("User", foreign_keys=[buyer_id],
                                back_populates="purchases")
    seller       = relationship("User", foreign_keys=[seller_id],
                                back_populates="sales")
    transactions = relationship("Transaction", back_populates="holding_record")

# MODEL: Transaction


class Transaction(Base):
    __tablename__ = "transactions"

    id                = Column(Integer, primary_key=True, index=True)
    holding_record_id = Column(Integer, ForeignKey("holding_records.id"),
                               nullable=False)
    from_user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount            = Column(DECIMAL(12, 2), nullable=False)
    transaction_type  = Column(Enum(TransactionType), nullable=False)
    created_at        = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    holding_record = relationship("HoldingRecord", back_populates="transactions")
    from_user      = relationship("User", foreign_keys=[from_user_id])
    to_user        = relationship("User", foreign_keys=[to_user_id])

    class Message(Base):
        __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    item_id    = Column(Integer, ForeignKey("items.id"), nullable=False)
    sender_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    item   = relationship("Item",  foreign_keys=[item_id])
    sender = relationship("User",  foreign_keys=[sender_id])