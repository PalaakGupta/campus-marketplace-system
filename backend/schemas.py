from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Annotated
from datetime import datetime
from decimal import Decimal
from enum import Enum
from datetime import datetime, date


# Enums (mirrored from models.py for API validation)

class ItemStatus(str, Enum):
    available = "available"
    reserved  = "reserved"
    sold      = "sold"


class ListingChannel(str, Enum):
    marketplace  = "marketplace"
    thrift_store = "thrift_store"


class HoldingStatus(str, Enum):
    holding  = "holding"
    released = "released"
    refunded = "refunded"


class TransactionType(str, Enum):
    purchase = "purchase"
    release  = "release"
    refund   = "refund"


# USER SCHEMAS

class UserRole(str, Enum):
    admin   = "admin"
    student = "student"


# Admin uses this to create a student account
class UserCreate(BaseModel):
    roll_number:   str  = Field(..., min_length=2, max_length=50)
    name:          str  = Field(..., min_length=2, max_length=100)
    email:         EmailStr
    date_of_birth: date  # Default password derived from this
    role:          UserRole = Field(default=UserRole.student)


# Student uses this to log in
class LoginRequest(BaseModel):
    roll_number: str = Field(..., min_length=2, max_length=50)
    password:    str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    message:     str
    user_id:     int
    roll_number: str
    name:        str
    role:        UserRole


# Student uses this to change their own password
class ChangePasswordRequest(BaseModel):
    user_id:      int = Field(..., gt=0)
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id:          int
    roll_number: str
    name:        str
    email:       EmailStr
    role:        UserRole
    is_active:   bool
    created_at:  datetime

    class Config:
        from_attributes = True


# WALLET SCHEMAS

class WalletBase(BaseModel):
    balance: Decimal = Field(
        default=0.00, ge=0
    )


class WalletResponse(WalletBase):
    id:         int
    user_id:    int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WalletTopUp(BaseModel):
    amount: Decimal = Field(
        ..., gt=0, description="Amount must be greater than zero"
    )

# ITEM SCHEMAS

class ItemBase(BaseModel):
    title:           str            = Field(..., min_length=3, max_length=200)
    description:     Optional[str]  = Field(None, max_length=2000)
    price:           Decimal = Field(
                         ..., gt=0, description="Price must be greater than zero"
                     )
    listing_channel: ListingChannel = Field(default=ListingChannel.marketplace)
    category:        Optional[str]  = Field(None, max_length=100)


class ItemCreate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id:         int
    seller_id:  int
    status:     ItemStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# PURCHASE SCHEMAS

class PurchaseRequest(BaseModel):
    buyer_id: int = Field(..., gt=0)
    item_id:  int = Field(..., gt=0)


class PurchaseResponse(BaseModel):
    message:           str
    holding_record_id: int
    item_id:           int
    amount:            Decimal = Field(..., max_digits=12, decimal_places=2)    
    status:            HoldingStatus

    class Config:
        from_attributes = True


# DELIVERY CONFIRMATION SCHEMAS

class DeliveryConfirmRequest(BaseModel):
    buyer_id:          int = Field(..., gt=0)
    holding_record_id: int = Field(..., gt=0)


class DeliveryConfirmResponse(BaseModel):
    message:           str
    holding_record_id: int
    transaction_id:    int
    amount_released:   Decimal = Field(..., max_digits=12, decimal_places=2)

    class Config:
        from_attributes = True



# HOLDING RECORD SCHEMAS

class HoldingRecordResponse(BaseModel):
    id:         int
    item_id:    int
    buyer_id:   int
    seller_id:  int
    amount:     Decimal = Field(..., max_digits=12, decimal_places=2)
    status:     HoldingStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# TRANSACTION SCHEMAS

class TransactionResponse(BaseModel):
    id:                int
    holding_record_id: int
    from_user_id:      int
    to_user_id:        int
    amount:            Decimal = Field(..., max_digits=12, decimal_places=2)
    transaction_type:  TransactionType
    created_at:        datetime

    class Config:
        from_attributes = True

# CHAT / MESSAGE SCHEMAS

class MessageCreate(BaseModel):
    sender_id: int  = Field(..., gt=0)
    content:   str  = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id:         int
    item_id:    int
    sender_id:  int
    content:    str
    created_at: datetime

    class Config:
        from_attributes = True


# GENERIC RESPONSE SCHEMAS

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str