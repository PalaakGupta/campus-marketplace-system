from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


#  Enums 

class AdminRoleSchema(str, Enum):
    super_admin = "super_admin"
    moderator   = "moderator"


class ReportCategorySchema(str, Enum):
    scam          = "scam"
    inappropriate = "inappropriate"
    fake_listing  = "fake_listing"
    harassment    = "harassment"
    other         = "other"


class ReportStatusSchema(str, Enum):
    pending   = "pending"
    resolved  = "resolved"
    dismissed = "dismissed"


class ReportTargetTypeSchema(str, Enum):
    user    = "user"
    listing = "listing"


#  Auth 

class AdminLoginRequest(BaseModel):
    admin_id: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    admin_id:     str
    name:         str
    role:         AdminRoleSchema


class AdminCreateRequest(BaseModel):
    admin_id:  str         = Field(..., min_length=2, max_length=50)
    name:      str         = Field(..., min_length=2, max_length=100)
    email:     EmailStr
    password:  str         = Field(..., min_length=8)
    role:      AdminRoleSchema = AdminRoleSchema.moderator


#  Dashboard Stats 

class AdminDashboardStats(BaseModel):
    total_users:           int
    active_users:          int
    total_listings:        int
    active_listings:       int
    sold_listings:         int
    total_purchases:       int
    active_vault_holdings: int
    total_wallet_balance:  float
    total_held_amount:     float
    unread_reports:        int
    new_users_today:       int
    sales_today:           int


#  User Management 

class AdminUserItem(BaseModel):
    id:             str
    login_id:       str
    name:           str
    email:          str
    role:           str
    is_active:      bool
    is_verified:    bool
    wallet_balance: float
    listing_count:  int
    purchase_count: int
    created_at:     str


class AdminUserListResponse(BaseModel):
    users:     List[AdminUserItem]
    total:     int
    page:      int
    page_size: int
    has_more:  bool


class AdminUserDetail(BaseModel):
    id:             str
    login_id:       str
    name:           str
    email:          str
    role:           str
    is_active:      bool
    is_verified:    bool
    wallet_balance: float
    held_balance:   float
    listing_count:  int
    purchase_count: int
    sales_count:    int
    last_seen_at:   Optional[str]
    created_at:     str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminUserStatusResponse(BaseModel):
    user_id:   str
    is_active: bool
    message:   str


#  Listing Management 

class AdminListingItem(BaseModel):
    id:              str
    title:           str
    price:           float
    status:          str
    listing_channel: str
    category:        Optional[str]
    seller_id:       str
    seller_name:     str
    view_count:      int
    created_at:      str


class AdminListingListResponse(BaseModel):
    listings:  List[AdminListingItem]
    total:     int
    page:      int
    page_size: int
    has_more:  bool


class AdminListingDetail(BaseModel):
    id:              str
    title:           str
    description:     Optional[str]
    price:           float
    status:          str
    listing_channel: str
    category:        Optional[str]
    condition_grade: Optional[str]
    seller_id:       str
    seller_name:     str
    seller_email:    str
    view_count:      int
    created_at:      str


class AdminListingDeleteResponse(BaseModel):
    item_id: str
    message: str


#  Transaction Management 

class AdminPurchaseItem(BaseModel):
    holding_id:  str
    item_id:     str
    item_title:  str
    buyer_id:    str
    buyer_name:  str
    seller_id:   str
    seller_name: str
    amount:      float
    status:      str
    created_at:  str
    released_at: Optional[str]
    refunded_at: Optional[str]


class AdminPurchaseListResponse(BaseModel):
    purchases: List[AdminPurchaseItem]
    total:     int
    page:      int
    page_size: int
    has_more:  bool


class AdminTransactionItem(BaseModel):
    id:               str
    holding_id:       str
    from_user_id:     str
    from_user_name:   str
    to_user_id:       str
    to_user_name:     str
    amount:           float
    transaction_type: str
    item_title:       Optional[str]
    created_at:       str


class AdminTransactionListResponse(BaseModel):
    transactions: List[AdminTransactionItem]
    total:        int
    page:         int
    page_size:    int
    has_more:     bool


class AdminRefundRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class AdminRefundResponse(BaseModel):
    holding_id:      str
    amount_refunded: float
    buyer_id:        str
    message:         str


#  Notification Management 

class AdminSendNotificationRequest(BaseModel):
    recipient_id:      Optional[str] = Field(
        None, description="Specific user ID. Omit to send to ALL users."
    )
    title:             str           = Field(..., min_length=3, max_length=200)
    message_body:      str           = Field(..., min_length=5, max_length=2000)


class AdminNotificationLogItem(BaseModel):
    id:              str
    recipient_id:    Optional[str]
    recipient_name:  Optional[str]
    title:           str
    message_body:    str
    sent_at:         str
    sent_by_name:    str


class AdminNotificationLogResponse(BaseModel):
    notifications: List[AdminNotificationLogItem]
    total:         int
    page:          int
    page_size:     int
    has_more:      bool


#  Reports Management 

class AdminReportItem(BaseModel):
    id:                str
    reporter_id:       str
    reporter_name:     str
    target_type:       str
    reported_user_id:  Optional[str]
    reported_user_name: Optional[str]
    reported_item_id:  Optional[str]
    reported_item_title: Optional[str]
    category:          str
    description:       str
    status:            str
    created_at:        str
    resolved_at:       Optional[str]
    resolution_note:   Optional[str]


class AdminReportListResponse(BaseModel):
    reports:   List[AdminReportItem]
    total:     int
    page:      int
    page_size: int
    has_more:  bool


class AdminResolveReportRequest(BaseModel):
    action:          str  = Field(..., description="resolved | dismissed")
    resolution_note: Optional[str] = Field(None, max_length=1000)


class AdminResolveReportResponse(BaseModel):
    report_id:       str
    new_status:      str
    resolution_note: Optional[str]
    message:         str


#  Activity Logs 

class AdminActivityLogItem(BaseModel):
    id:            str
    admin_name:    str
    activity_type: str
    target_id:     Optional[str]
    target_type:   Optional[str]
    note:          Optional[str]
    created_at:    str


class AdminActivityLogResponse(BaseModel):
    logs:      List[AdminActivityLogItem]
    total:     int
    page:      int
    page_size: int
    has_more:  bool