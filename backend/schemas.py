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
    admin                = "admin"
    student              = "student"
    professor            = "professor"
    teaching_assistant   = "teaching_assistant"
    lab_staff            = "lab_staff"
    administrative_staff = "administrative_staff"


class UserCreate(BaseModel):
    login_id:      str      = Field(..., min_length=2, max_length=50,
                                    description="Roll number for students, employee ID for staff")
    name:          str      = Field(..., min_length=2, max_length=100)
    email:         EmailStr
    date_of_birth: date
    role:          UserRole = Field(default=UserRole.student)


class LoginRequest(BaseModel):
    login_id: str = Field(..., min_length=2, max_length=50,
                          description="Roll number for students, employee ID for staff")
    password: str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type:   str
    user_id:      str
    login_id:     str
    name:         str
    role:         UserRole


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id:          str
    login_id:    str
    name:        str
    email:       EmailStr
    role:        UserRole
    is_active:   bool
    is_verified: bool
    created_at:  datetime

    class Config:
        from_attributes = True

# WALLET SCHEMAS

class WalletBase(BaseModel):
    balance: Decimal = Field(
        default=0.00, ge=0
    )


class WalletResponse(WalletBase):
    id:         str
    user_id:    str
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
    condition:       Optional[str]         = Field(None)  
    condition_grade: Optional[str]         = Field(None)

class ItemCreate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id:         str
    seller_id:  str
    seller_name: Optional[str] = None
    seller_role: Optional[str] = None
    status:     ItemStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# PURCHASE SCHEMAS

class PurchaseRequest(BaseModel):
    buyer_id: str = Field(...)
    item_id:  str = Field(...)


class PurchaseResponse(BaseModel):
    message:           str
    holding_record_id: str
    item_id:           str
    amount:            Decimal = Field(..., max_digits=12, decimal_places=2)    
    status:            HoldingStatus

    class Config:
        from_attributes = True


# DELIVERY CONFIRMATION SCHEMAS

class DeliveryConfirmRequest(BaseModel):
    buyer_id:          str = Field(...)
    holding_record_id: str = Field(...)


class DeliveryConfirmResponse(BaseModel):
    message:           str
    holding_record_id: str
    transaction_id:    str
    amount_released:   Decimal = Field(..., max_digits=12, decimal_places=2)

    class Config:
        from_attributes = True



# HOLDING RECORD SCHEMAS

class HoldingRecordResponse(BaseModel):
    id:         str
    item_id:    str
    buyer_id:   str
    seller_id:  str
    amount:     Decimal = Field(..., max_digits=12, decimal_places=2)
    status:     HoldingStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# TRANSACTION SCHEMAS

class TransactionResponse(BaseModel):
    id:                str
    holding_record_id: str
    from_user_id:      str
    to_user_id:        str
    amount:            Decimal = Field(..., max_digits=12, decimal_places=2)
    transaction_type:  TransactionType
    created_at:        datetime

    class Config:
        from_attributes = True

# CHAT / MESSAGE SCHEMAS

class MessageCreate(BaseModel):
    sender_id: str  = Field(...)
    content:   str  = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id:         str
    item_id:    str
    sender_id:  str
    content:    str
    created_at: datetime

    class Config:
        from_attributes = True


# GENERIC RESPONSE SCHEMAS

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str