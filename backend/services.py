from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from decimal import Decimal
from fastapi import HTTPException, status
from auth import hash_password, verify_password, default_password, create_access_token
import models
import schemas
from logger import get_logger
import os

logger = get_logger(__name__)

# USER SERVICES




def create_user(db: Session, payload: schemas.UserCreate) -> models.User:
    existing_email = db.query(models.User).filter(
        models.User.email == payload.email
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT",
                    "message": "A user with this email already exists."}
        )

    existing_login = db.query(models.User).filter(
        models.User.login_id == payload.login_id
    ).first()
    if existing_login:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT",
                    "message": "A user with this login ID already exists."}
        )

    raw_password = default_password(payload.date_of_birth)

    user = models.User(
        login_id      = payload.login_id,
        name          = payload.name,
        email         = payload.email,
        password_hash = hash_password(raw_password),
        role          = payload.role
    )
    db.add(user)
    db.flush()

    wallet = models.Wallet(
        user_id = user.id,
        balance = Decimal("0.00")
    )
    db.add(wallet)
    db.commit()
    db.refresh(user)

    logger.info(
        f"User created: id={user.id} login_id={user.login_id} role={user.role}"
    )
    return user


def login(db: Session, payload: schemas.LoginRequest) -> dict:
    user = db.query(models.User).filter(
        models.User.login_id == payload.login_id
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning(
            f"Failed login attempt: login_id={payload.login_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED",
                    "message": "Invalid login ID or password."}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN",
                    "message": "Account deactivated. Contact admin."}
        )

    token = create_access_token(user.id, user.role)

    logger.info(f"Login successful: user_id={user.id} role={user.role}")
    return {
        "access_token" : token,
        "token_type"   : "bearer",
        "user_id"      : user.id,
        "login_id"     : user.login_id,
        "name"         : user.name,
        "role"         : user.role
    }


def change_password(
    db: Session,
    user: models.User,
    payload: schemas.ChangePasswordRequest
) -> dict:
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED",
                    "message": "Old password is incorrect."}
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    logger.info(f"Password changed: user_id={user.id}")
    return {"message": "Password changed successfully."}

def get_user_by_id(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found."
        )
    return user

# WALLET SERVICES

def get_wallet(db: Session, user_id: int) -> models.Wallet:
    wallet = db.query(models.Wallet).filter(
        models.Wallet.user_id == user_id
    ).first()

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wallet not found for user {user_id}."
        )
    return wallet


def topup_wallet(
    db: Session,
    user_id: int,
    payload: schemas.WalletTopUp
) -> models.Wallet:
    """
    Add tokens to a user's wallet.
    """
    wallet = get_wallet(db, user_id)
    wallet.balance += Decimal(str(payload.amount))
    db.commit()
    db.refresh(wallet)

    logger.info(
        f"Wallet topped up: user_id={user_id} "
        f"amount={payload.amount} new_balance={wallet.balance}"
    )
    return wallet

# ITEM SERVICES

def create_item(
    db: Session,
    seller_id: str,
    payload: schemas.ItemCreate
) -> models.Item:
    """
    List a new item for sale. Validates the seller exists.
    """
    get_user_by_id(db, seller_id)  # Raises 404 if seller does not exist

    condition = payload.condition or payload.condition_grade

    item = models.Item(
        seller_id       = seller_id,
        title           = payload.title,
        description     = payload.description,
        price           = Decimal(str(payload.price)),
        listing_channel = payload.listing_channel,
        category        = payload.category,
        condition_grade = condition
)  

    db.add(item)
    db.commit()
    db.refresh(item)

    logger.info(
        f"Item listed: id={item.id} title='{item.title}' "
        f"channel={item.listing_channel} seller_id={seller_id}"
    )
    return item


def get_items(db, channel=None, category=None, search=None):
    query = db.query(models.Item).filter(
        models.Item.status == models.ItemStatus.available
    )
    if channel:
        query = query.filter(models.Item.listing_channel == channel)
    if category and category.lower() != "all":
        query = query.filter(models.Item.category == category)
    if search:
        query = query.filter(models.Item.title.ilike(f"%{search}%"))

    items = query.all()
    result = []
    for item in items:
        seller = get_user_by_id(db, item.seller_id)
        result.append({
            "id"             : item.id,
            "title"          : item.title,
            "price"          : float(item.price),
            "condition"      : item.condition_grade,
            "category"       : item.category,
            "listing_channel": item.listing_channel,
            "status"         : item.status,
            "image_url"      : None,
            "seller_id"      : item.seller_id,
            "seller_name"    : seller.name,
            "seller_role"    : seller.role,
            "view_count"     : item.view_count,
            "created_at"     : item.created_at.isoformat()
        })
    return result

def get_item_by_id(db: Session, item_id: str) -> models.Item:
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found."
        )
    return item

# PURCHASE SERVICE — The vault logic lives here

def purchase_item(
    db: Session,
    payload: schemas.PurchaseRequest
) -> models.HoldingRecord:
    """
    Core escrow purchase flow:
    1. Validate buyer and item exist
    2. Prevent buyer from purchasing their own item
    3. Confirm item is still available
    4. Check buyer has sufficient balance
    5. Deduct tokens from buyer wallet
    6. Lock tokens in holding record
    7. Mark item as reserved
    8. Write transaction to ledger
    All steps happen in one atomic database transaction.
    """

    # Step 1 — Fetch buyer and item
    buyer = get_user_by_id(db, payload.buyer_id)
    item  = get_item_by_id(db, payload.item_id)

    # Step 2 — Prevent self-purchase
    if item.seller_id == payload.buyer_id:
        logger.warning(
            f"Self-purchase attempt: user_id={payload.buyer_id} "
            f"item_id={payload.item_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot purchase your own item."
        )

    # Step 3 — Check item is still available
    if item.status != models.ItemStatus.available:
        logger.warning(
            f"Purchase attempt on unavailable item: "
            f"item_id={item.id} status={item.status}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item is no longer available. Current status: {item.status}"
        )

    # Step 4 — Check buyer balance
    buyer_wallet = get_wallet(db, payload.buyer_id)
    item_price   = Decimal(str(item.price))

    if buyer_wallet.balance < item_price:
        logger.error(
            f"Insufficient balance: user_id={payload.buyer_id} "
            f"balance={buyer_wallet.balance} required={item_price}"
        )
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient balance. "
                f"Required: {item_price}, Available: {buyer_wallet.balance}"
            )
        )

    try:
        # Step 5 — Deduct tokens from buyer wallet
        buyer_wallet.balance -= item_price
        db.flush()

        # Step 6 — Create holding record (vault lock)
        holding = models.HoldingRecord(
            item_id   = item.id,
            buyer_id  = payload.buyer_id,
            seller_id = item.seller_id,
            amount    = item_price,
            status    = models.HoldingStatus.holding
        )
        db.add(holding)
        db.flush()  # Get holding.id before writing transaction

        logger.info(
            f"Vault locked: holding_id={holding.id} "
            f"item_id={item.id} amount={item_price} "
            f"buyer_id={payload.buyer_id} seller_id={item.seller_id}"
        )

        # Step 7 — Mark item as reserved
        item.status = models.ItemStatus.reserved
        db.flush()

        # Step 8 — Write purchase transaction to ledger
        txn = models.Transaction(
            holding_record_id = holding.id,
            from_user_id      = payload.buyer_id,
            to_user_id        = item.seller_id,
            amount            = item_price,
            transaction_type  = models.TransactionType.purchase
        )
        db.add(txn)

        db.commit()
        db.refresh(holding)

        logger.info(
            f"Purchase complete: txn_id={txn.id} "
            f"item_id={item.id} buyer_id={payload.buyer_id}"
        )
        return holding

    except IntegrityError:
        db.rollback()
        logger.error(
            f"Duplicate purchase attempt blocked by DB constraint: "
            f"item_id={payload.item_id} buyer_id={payload.buyer_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This item was already purchased. Please try another item."
        )

# DELIVERY CONFIRMATION SERVICE

def confirm_delivery(
    db: Session,
    payload: schemas.DeliveryConfirmRequest
) -> dict:
    """
    Buyer confirms they received the item.
    Releases locked tokens from vault to seller wallet.
    Marks item as sold.
    """

    # Fetch the holding record
    holding = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.id == payload.holding_record_id
    ).first()

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Holding record {payload.holding_record_id} not found."
        )

    # Only the buyer who made the purchase can confirm delivery
    if holding.buyer_id != payload.buyer_id:
        logger.warning(
            f"Unauthorised delivery confirmation attempt: "
            f"holding_id={holding.id} "
            f"actual_buyer={holding.buyer_id} "
            f"attempted_by={payload.buyer_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer of this item can confirm delivery."
        )

    # Prevent double confirmation
    if holding.status != models.HoldingStatus.holding:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Holding record is already {holding.status}. Cannot confirm again."
        )

    # Release tokens to seller wallet
    seller_wallet = get_wallet(db, holding.seller_id)
    seller_wallet.balance += Decimal(str(holding.amount))
    db.flush()

    # Update holding record status
    holding.status = models.HoldingStatus.released
    db.flush()

    # Mark item as sold
    item = get_item_by_id(db, holding.item_id)
    item.status = models.ItemStatus.sold
    db.flush()

    # Write release transaction to ledger
    txn = models.Transaction(
        holding_record_id = holding.id,
        from_user_id      = holding.buyer_id,
        to_user_id        = holding.seller_id,
        amount            = holding.amount,
        transaction_type  = models.TransactionType.release
    )
    db.add(txn)
    db.commit()

    logger.info(
        f"Delivery confirmed: holding_id={holding.id} "
        f"item_id={holding.item_id} "
        f"amount_released={holding.amount} "
        f"seller_id={holding.seller_id}"
    )

    return {
        "message"          : "Delivery confirmed. Tokens released to seller.",
        "holding_record_id": holding.id,
        "transaction_id"   : txn.id,
        "amount_released"  : holding.amount
    }

# HOLDING RECORD SERVICES

def get_holding_records(
    db: Session,
    user_id: int
) -> list[models.HoldingRecord]:
    """
    Return all holding records where the user
    is either the buyer or the seller.
    """
    get_user_by_id(db, user_id)

    return db.query(models.HoldingRecord).filter(
        (models.HoldingRecord.buyer_id  == user_id) |
        (models.HoldingRecord.seller_id == user_id)
    ).all()


# CHAT SERVICES

def validate_chat_participant(
    db: Session,
    item_id: str,
    user_id: int
) -> bool:
    """
    Verify the user is allowed to chat on this item.
    Rules:
    - The seller of the item can always chat
    - Any other user can chat before purchase (asking questions)
    - After purchase only the confirmed buyer can chat
    """
    item = get_item_by_id(db, item_id)

    # Seller can always participate
    if item.seller_id == user_id:
        return True

    # If item is sold or reserved, only the confirmed buyer can chat
    if item.status in [
        models.ItemStatus.reserved,
        models.ItemStatus.sold
    ]:
        holding = db.query(models.HoldingRecord).filter(
            models.HoldingRecord.item_id == item_id
        ).first()

        if holding and holding.buyer_id == user_id:
            return True

        logger.warning(
            f"Unauthorised chat attempt: user_id={user_id} "
            f"item_id={item_id} item_status={item.status}"
        )
        return False

    # Item is still available — any user can ask questions
    return True


def save_message(
    db: Session,
    item_id: str,
    payload: schemas.MessageCreate
) -> models.Message:
    """
    Persist a chat message to the database.
    """
    get_item_by_id(db, item_id)
    get_user_by_id(db, payload.sender_id)

    allowed = validate_chat_participant(db, item_id, payload.sender_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to chat on this item."
        )

    message = models.Message(
        item_id   = item_id,
        sender_id = payload.sender_id,
        content   = payload.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    logger.info(
        f"Message saved: item_id={item_id} "
        f"sender_id={payload.sender_id} "
        f"message_id={message.id}"
    )
    return message


def get_chat_history(
    db: Session,
    item_id: str,
    user_id: int
) -> list[models.Message]:
    """
    Return all messages for an item conversation.
    Validates the requester is a participant first.
    """
    get_item_by_id(db, item_id)

    allowed = validate_chat_participant(db, item_id, user_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to view this conversation."
        )

    return db.query(models.Message).filter(
        models.Message.item_id == item_id
    ).order_by(models.Message.created_at.asc()).all()



def sync_wallet_from_card(db: Session, user_id: int) -> models.Wallet:
    """
    Syncs wallet balance from the campus card system.
    In production, replace the mock with a real card API call.
    """
    wallet = get_wallet(db, user_id)

    # ── REPLACE THIS BLOCK when the real card API is available ──
    import httpx
    CARD_API_URL = os.getenv("CARD_API_URL", "")

    if CARD_API_URL:
        response = httpx.get(
            f"{CARD_API_URL}/balance",
            params={"user_id": user_id},
            timeout=5.0
        )
        response.raise_for_status()
        card_balance = Decimal(str(response.json()["balance"]))
    else:
        # Mock balance for development — remove in production
        card_balance = Decimal("1000.00")
        logger.warning(
            f"CARD_API_URL not set — using mock balance "
            f"for user_id={user_id}"
        )
    # ── END REPLACE BLOCK ──

    wallet.balance = card_balance
    db.commit()
    db.refresh(wallet)

    logger.info(
        f"Wallet synced from card: user_id={user_id} "
        f"balance={wallet.balance}"
    )
    return wallet

# DASHBOARD SERVICE
def get_dashboard(db: Session, current_user: models.User) -> dict:
    from sqlalchemy import func

    # Wallet
    wallet = get_wallet(db, current_user.id)
    available_balance = float(wallet.balance)

    # Held balance — sum of all holding records where user is buyer
    held_result = db.query(func.sum(models.HoldingRecord.amount)).filter(
        models.HoldingRecord.buyer_id == current_user.id,
        models.HoldingRecord.status  == models.HoldingStatus.holding
    ).scalar()
    held_balance = float(held_result or 0)

    # Stats
    active_listings = db.query(models.Item).filter(
        models.Item.seller_id == current_user.id,
        models.Item.status    == models.ItemStatus.available
    ).count()

    saved_count = db.query(models.SavedItem).filter(
        models.SavedItem.user_id == current_user.id
    ).count()

    unread_messages = db.query(models.Message).filter(
        models.Message.sender_id != current_user.id,
        models.Message.is_read   == False,
        models.Message.item_id.in_(
            db.query(models.Item.id).filter(
                models.Item.seller_id == current_user.id
            )
        )
    ).count()

    completed_sales = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.seller_id == current_user.id,
        models.HoldingRecord.status    == models.HoldingStatus.released
    ).count()

    total_purchases = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.buyer_id == current_user.id
    ).count()

    # Active purchase (most recent holding record as buyer)
    activePurchase = None
    holding = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.buyer_id == current_user.id,
        models.HoldingRecord.status   == models.HoldingStatus.holding
    ).order_by(models.HoldingRecord.created_at.desc()).first()

    if holding:
        item   = get_item_by_id(db, holding.item_id)
        seller = get_user_by_id(db, holding.seller_id)
        activePurchase = {
            "purchase_id"    : holding.id,
            "item_id"        : item.id,
            "title"          : item.title,
            "image_url"      : None,
            "price"          : float(item.price),
            "payment_status" : holding.status,
            "seller_name"    : seller.name,
            "seller_role"    : seller.role,
            "purchased_at"   : holding.created_at.isoformat()
        }

    # Recent listings (latest 4 available items, not own)
    recent_items = db.query(models.Item).filter(
        models.Item.status    == models.ItemStatus.available,
        models.Item.seller_id != current_user.id
    ).order_by(models.Item.created_at.desc()).limit(4).all()

    recent_listings = []
    for item in recent_items:
        seller = get_user_by_id(db, item.seller_id)
        saved  = db.query(models.SavedItem).filter(
            models.SavedItem.item_id == item.id
        ).count()
        recent_listings.append({
            "id"             : item.id,
            "title"          : item.title,
            "price"          : float(item.price),
            "condition"      : item.condition_grade,
            "category"       : item.category,
            "channel"        : item.listing_channel,
            "status"         : item.status,
            "image_url"      : None,
            "seller_name"    : seller.name,
            "seller_verified": seller.is_verified,
            "saved_count"    : saved,
            "view_count"     : item.view_count
        })

    name_parts = current_user.name.strip().split()
    initials   = (name_parts[0][0] + name_parts[-1][0]).upper() \
                 if len(name_parts) >= 2 else name_parts[0][0].upper()

    return {
        "user": {
            "id"             : current_user.id,
            "name"           : current_user.name,
            "role"           : current_user.role,
            "avatar_initials": initials
        },
        "wallet": {
            "available_balance": available_balance,
            "held_balance"     : held_balance
        },
        "stats": {
            "active_listings" : active_listings,
            "saved_items"     : saved_count,
            "unread_messages" : unread_messages,
            "completed_sales" : completed_sales,
            "total_purchases" : total_purchases
        },
        "activePurchase" : activePurchase,
        "recent_listings" : recent_listings
    }

# SAVED ITEMS SERVICES

def save_item(db: Session, item_id: str,
              current_user: models.User) -> dict:
    item = get_item_by_id(db, item_id)

    if item.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "OWN_LISTING",
                    "message": "You cannot save your own listing."}
        )

    existing = db.query(models.SavedItem).filter(
        models.SavedItem.user_id == current_user.id,
        models.SavedItem.item_id == item_id
    ).first()

    if not existing:
        saved = models.SavedItem(
            user_id = current_user.id,
            item_id = item_id
        )
        db.add(saved)
        try:
            db.commit()
        except Exception:
            db.rollback()

    from sqlalchemy import func
    saved_count = db.query(func.count(models.SavedItem.id)).filter(
        models.SavedItem.item_id == item_id
    ).scalar() or 0

    return {"item_id": item_id, "is_saved": True,
            "saved_count": saved_count}


def unsave_item(db: Session, item_id: str,
                current_user: models.User) -> dict:
    get_item_by_id(db, item_id)

    existing = db.query(models.SavedItem).filter(
        models.SavedItem.user_id == current_user.id,
        models.SavedItem.item_id == item_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    from sqlalchemy import func
    saved_count = db.query(func.count(models.SavedItem.id)).filter(
        models.SavedItem.item_id == item_id
    ).scalar() or 0

    return {"item_id": item_id, "is_saved": False,
            "saved_count": saved_count}


def get_saved_items(db: Session,
                    current_user: models.User) -> list:
    rows = db.query(models.SavedItem).filter(
        models.SavedItem.user_id == current_user.id
    ).order_by(models.SavedItem.saved_at.desc()).all()

    result = []
    for saved in rows:
        item   = get_item_by_id(db, saved.item_id)
        seller = get_user_by_id(db, item.seller_id)
        result.append({
            "id"         : saved.id,
            "item_id"    : item.id,
            "title"      : item.title,
            "price"      : float(item.price),
            "condition"  : item.condition_grade,
            "category"   : item.category,
            "channel"    : item.listing_channel,
            "status"     : item.status,
            "image_url"  : None,
            "seller_name": seller.name,
            "saved_at"   : saved.saved_at.isoformat()
        })
    return result



# WALLET SUMMARY SERVICE
def get_wallet_summary(db: Session,
                       current_user: models.User) -> dict:
    from sqlalchemy import func
    wallet = get_wallet(db, current_user.id)

    holds = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.buyer_id == current_user.id,
        models.HoldingRecord.status   == models.HoldingStatus.holding
    ).order_by(models.HoldingRecord.created_at.desc()).all()

    total_held   = 0
    active_holds = []
    for hold in holds:
        item   = get_item_by_id(db, hold.item_id)
        seller = get_user_by_id(db, hold.seller_id)
        amount = float(hold.amount)
        total_held += amount
        active_holds.append({
            "purchase_id": hold.id,
            "item_id"    : item.id,
            "title"      : item.title,
            "image_url"  : None,
            "amount"     : amount,
            "seller_name": seller.name,
            "held_since" : hold.created_at.isoformat()
        })

    available = float(wallet.balance)
    return {
        "available_balance": available,
        "held_balance"     : total_held,
        "total_balance"    : available + total_held,
        "active_holds"     : active_holds
    }


def get_transaction_history(db: Session, current_user: models.User,
                             tx_type: str = None,
                             page: int = 1,
                             page_size: int = 20) -> dict:
    if page_size > 50:
        page_size = 50

    query = db.query(models.Transaction).filter(
        (models.Transaction.from_user_id == current_user.id) |
        (models.Transaction.to_user_id   == current_user.id)
    )

    if tx_type and tx_type != "all":
        query = query.filter(
            models.Transaction.transaction_type == tx_type
        )

    total  = query.count()
    offset = (page - 1) * page_size
    rows   = query.order_by(
        models.Transaction.created_at.desc()
    ).offset(offset).limit(page_size).all()

    result = []
    for tx in rows:
        hold        = db.query(models.HoldingRecord).filter(
            models.HoldingRecord.id == tx.holding_record_id
        ).first()
        item        = get_item_by_id(db, hold.item_id) if hold else None
        counterpart = tx.to_user_id \
                      if tx.from_user_id == current_user.id \
                      else tx.from_user_id
        other_user  = get_user_by_id(db, counterpart)

        is_debit = tx.from_user_id == current_user.id
        result.append({
            "id"               : tx.id,
            "transaction_type" : tx.transaction_type,
            "title"            : item.title if item else "Unknown",
            "amount"           : -float(tx.amount) if is_debit
                                  else float(tx.amount),
            "payment_status"   : hold.status if hold else None,
            "counterparty_name": other_user.name,
            "date"             : tx.created_at.isoformat()
        })

    return {
        "transactions": result,
        "page"        : page,
        "page_size"   : page_size,
        "total"       : total,
        "has_more"    : (offset + page_size) < total
    }


# MY LISTINGS SERVICE

def get_my_listings(db: Session, current_user: models.User,
                    status_filter: str = None) -> dict:
    from sqlalchemy import func

    base = db.query(models.Item).filter(
        models.Item.seller_id == current_user.id
    )

    available_count = base.filter(
        models.Item.status == models.ItemStatus.available).count()
    reserved_count  = base.filter(
        models.Item.status == models.ItemStatus.reserved).count()
    sold_count      = base.filter(
        models.Item.status == models.ItemStatus.sold).count()

    total_earned = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.to_user_id       == current_user.id,
        models.Transaction.transaction_type == models.TransactionType.release
    ).scalar() or 0

    query = base
    if status_filter and status_filter.lower() != "all":
        query = base.filter(
            models.Item.status == status_filter.lower()
        )

    items = query.order_by(models.Item.created_at.desc()).all()

    listings = []
    for item in items:
        saved_count = db.query(func.count(models.SavedItem.id)).filter(
            models.SavedItem.item_id == item.id
        ).scalar() or 0

        msg_count = db.query(func.count(models.Message.id)).filter(
            models.Message.item_id == item.id
        ).scalar() or 0

        listings.append({
            "id"           : item.id,
            "title"        : item.title,
            "price"        : float(item.price),
            "condition"    : item.condition_grade if item.condition_grade else None,
            "status"       : item.status,
            "channel"      : item.listing_channel,
            "image_url"    : None,
            "view_count"   : item.view_count,
            "saved_count"  : saved_count,
            "message_count": msg_count,
            "created_at"   : item.created_at.isoformat()
        })

    return {
        "stats": {
            "available"   : available_count,
            "reserved"    : reserved_count,
            "sold"        : sold_count,
            "total_earned": float(total_earned)
        },
        "listings": listings
    }
def increment_view(db, item_id):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item:
        item.view_count += 1
        db.commit()

def update_item_status(db: Session, item_id: str,
                       new_status: str,
                       current_user: models.User) -> dict:
    item = get_item_by_id(db, item_id)

    if item.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN",
                    "message": "You do not own this listing."}
        )

    allowed = {"available": ["sold"], "reserved": [], "sold": []}
    if new_status.lower() not in allowed.get(item.status.value, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATUS_TRANSITION",
                    "message": f"Cannot change from "
                               f"'{item.status}' to '{new_status}'."}
        )

    item.status = new_status.lower()
    db.commit()
    db.refresh(item)

    logger.info(f"Item status updated: item_id={item_id} "
                f"new_status={new_status}")
    return {
        "item_id"   : item.id,
        "new_status": item.status,
        "updated_at": item.updated_at.isoformat()
    }


# MY PURCHASES SERVICE

def get_my_purchases(db: Session, current_user: models.User,
                     payment_status: str = None,
                     page: int = 1,
                     page_size: int = 20) -> dict:
    if page_size > 50:
        page_size = 50

    query = db.query(models.HoldingRecord).filter(
        models.HoldingRecord.buyer_id == current_user.id
    )

    if payment_status and payment_status.lower() != "all":
        query = query.filter(
            models.HoldingRecord.status == payment_status.lower()
        )

    total  = query.count()
    offset = (page - 1) * page_size
    rows   = query.order_by(
        models.HoldingRecord.created_at.desc()
    ).offset(offset).limit(page_size).all()

    purchases = []
    for hold in rows:
        item   = get_item_by_id(db, hold.item_id)
        seller = get_user_by_id(db, hold.seller_id)
        purchases.append({
            "id"            : hold.id,
            "item_id"       : item.id,
            "title"         : item.title,
            "image_url"     : None,
            "price"         : float(hold.amount),
            "payment_status": hold.status,
            "seller_name"   : seller.name,
            "seller_role"   : seller.role,
            "purchased_at"  : hold.created_at.isoformat(),
            "confirmed_at"  : hold.confirmed_at.isoformat()
                              if hold.confirmed_at else None,
            "released_at"   : hold.released_at.isoformat()
                              if hold.released_at else None,
            "refunded_at"   : hold.refunded_at.isoformat()
                              if hold.refunded_at else None
        })

    return {
        "purchases": purchases,
        "page"     : page,
        "page_size": page_size,
        "total"    : total,
        "has_more" : (offset + page_size) < total
    }


# NOTIFICATIONS SERVICE

def get_notifications(db: Session, current_user: models.User,
                      page: int = 1, page_size: int = 20,
                      unread_only: bool = False) -> dict:
    from sqlalchemy import func
    if page_size > 50:
        page_size = 50

    query = db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id
    )
    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    unread_count = db.query(func.count(models.Notification.id)).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read      == False
    ).scalar() or 0

    total  = query.count()
    offset = (page - 1) * page_size
    rows   = query.order_by(
        models.Notification.created_at.desc()
    ).offset(offset).limit(page_size).all()

    notifications = [{
        "id"                 : n.id,
        "notification_type"  : n.notification_type,
        "title"              : n.title,
        "message"            : n.message,
        "is_read"            : n.is_read,
        "related_item_id"    : n.related_item_id,
        "related_holding_id" : n.related_holding_id,
        "created_at"         : n.created_at.isoformat(),
        "read_at"            : n.read_at.isoformat()
                               if n.read_at else None
    } for n in rows]

    return {
        "notifications": notifications,
        "unread_count" : unread_count,
        "total"        : total,
        "page"         : page,
        "page_size"    : page_size,
        "has_more"     : (offset + page_size) < total
    }


def mark_notifications_read(db: Session,
                             current_user: models.User) -> dict:
    from datetime import datetime
    unread = db.query(models.Notification).filter(
        models.Notification.recipient_id == current_user.id,
        models.Notification.is_read      == False
    ).all()

    now = datetime.utcnow()
    for n in unread:
        n.is_read = True
        n.read_at = now
    db.commit()

    return {"marked_count": len(unread),
            "message"     : "Notifications marked as read."}


def create_notification(db: Session, recipient_id: str,
                        notification_type: models.NotificationType,
                        title: str, message: str,
                        related_item_id: str = None,
                        related_holding_id: str = None):
    notif = models.Notification(
        recipient_id       = recipient_id,
        notification_type  = notification_type,
        title              = title,
        message            = message,
        related_item_id    = related_item_id,
        related_holding_id = related_holding_id
    )
    db.add(notif)
    db.commit()
    logger.info(f"Notification created: recipient={recipient_id} "
                f"type={notification_type}")


# PROFILE SERVICE

def get_my_profile(db: Session,
                   current_user: models.User) -> dict:
    from sqlalchemy import func
    wallet = get_wallet(db, current_user.id)

    held = db.query(func.sum(models.HoldingRecord.amount)).filter(
        models.HoldingRecord.buyer_id == current_user.id,
        models.HoldingRecord.status   == models.HoldingStatus.holding
    ).scalar() or 0

    listing_count = db.query(func.count(models.Item.id)).filter(
        models.Item.seller_id == current_user.id
    ).scalar() or 0

    sold_count = db.query(func.count(models.Item.id)).filter(
        models.Item.seller_id == current_user.id,
        models.Item.status    == models.ItemStatus.sold
    ).scalar() or 0

    purchase_count = db.query(func.count(models.HoldingRecord.id)).filter(
        models.HoldingRecord.buyer_id == current_user.id
    ).scalar() or 0

    name_parts = current_user.name.strip().split()
    initials   = (name_parts[0][0] + name_parts[-1][0]).upper() \
                 if len(name_parts) >= 2 else name_parts[0][0].upper()

    return {
        "id"               : current_user.id,
        "name"             : current_user.name,
        "email"            : current_user.email,
        "role"             : current_user.role,
        "is_verified"      : current_user.is_verified,
        "avatar_initials"  : initials,
        "available_balance": float(wallet.balance),
        "held_balance"     : float(held),
        "stats": {
            "listing_count" : listing_count,
            "sold_count"    : sold_count,
            "purchase_count": purchase_count,
            "rating"        : None
        },
        "joined_at": current_user.created_at.isoformat()
    }