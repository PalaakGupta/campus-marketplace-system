from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from decimal import Decimal
from fastapi import HTTPException, status

import models
import schemas
from logger import get_logger

logger = get_logger(__name__)

# USER SERVICES

def create_user(db: Session, payload: schemas.UserCreate) -> models.User:
    """
    Create a new user and automatically provision their wallet.
    Every user gets a wallet the moment they register.
    """
    existing = db.query(models.User).filter(
        models.User.email == payload.email
    ).first()

    if existing:
        logger.warning(f"Registration attempt with duplicate email: {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists."
        )

    # In production you would use bcrypt here.
    # We store a placeholder hash for now.
    fake_hash = f"hashed_{payload.password}"

    user = models.User(
        name          = payload.name,
        email         = payload.email,
        password_hash = fake_hash
    )
    db.add(user)
    db.flush()  # Assigns user.id without committing yet

    wallet = models.Wallet(
        user_id = user.id,
        balance = Decimal("0.00")
    )
    db.add(wallet)
    db.commit()
    db.refresh(user)

    logger.info(f"New user created: id={user.id} email={user.email}")
    return user


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
    seller_id: int,
    payload: schemas.ItemCreate
) -> models.Item:
    """
    List a new item for sale. Validates the seller exists.
    """
    get_user_by_id(db, seller_id)  # Raises 404 if seller does not exist

    item = models.Item(
        seller_id       = seller_id,
        title           = payload.title,
        description     = payload.description,
        price           = Decimal(str(payload.price)),
        listing_channel = payload.listing_channel,
        category        = payload.category
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    logger.info(
        f"Item listed: id={item.id} title='{item.title}' "
        f"channel={item.listing_channel} seller_id={seller_id}"
    )
    return item


def get_items(
    db: Session,
    channel: schemas.ListingChannel = None
) -> list[models.Item]:
    """
    Return all available items.
    Optionally filter by listing channel.
    """
    query = db.query(models.Item).filter(
        models.Item.status == models.ItemStatus.available
    )

    if channel:
        query = query.filter(models.Item.listing_channel == channel)

    return query.all()


def get_item_by_id(db: Session, item_id: int) -> models.Item:
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

# ================================================================
# CHAT SERVICES
# ================================================================

def validate_chat_participant(
    db: Session,
    item_id: int,
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
    item_id: int,
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
    item_id: int,
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