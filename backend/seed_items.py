import sys, os, uuid
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from db import SessionLocal
from models import Item, User, ItemStatus, ListingChannel, ItemCondition
from decimal import Decimal

db = SessionLocal()

seller = db.query(User).filter(User.login_id == "CS2021002").first()
if not seller:
    print("Seller CS2021002 not found. Run seed_users.py first.")
    db.close()
    exit()

items = [
    {"title": "Scientific Calculator", "price": 200, "category": "Electronics",   "condition_grade": "Like new",  "channel": ListingChannel.marketplace,  "description": "Casio FX-991, barely used"},
    {"title": "Calculus Textbook",     "price": 150, "category": "Books",          "condition_grade": "Good",       "channel": ListingChannel.thrift_store, "description": "12th edition, minor highlights"},
    {"title": "Lab Coat",              "price": 80,  "category": "Lab Equipment",  "condition_grade": "Good",       "channel": ListingChannel.thrift_store, "description": "Size M, used one semester"},
    {"title": "Laptop Stand",          "price": 300, "category": "Electronics",    "condition_grade": "Like new",  "channel": ListingChannel.marketplace,  "description": "Adjustable aluminium stand"},
    {"title": "Hoodie XL",             "price": 50,  "category": "Clothing",       "condition_grade": "Fair",       "channel": ListingChannel.thrift_store, "description": "Blue hoodie, warm"},
]

for i in items:
    item = Item(
        id=str(uuid.uuid4()),
        seller_id=seller.id,
        title=i["title"],
        price=Decimal(str(i["price"])),
        category=i["category"],
        condition_grade=i["condition_grade"],
        listing_channel=i["channel"],
        description=i["description"],
        status=ItemStatus.available
    )
    db.add(item)
    print(f"  OK  {i['title']} — ₹{i['price']} — {i['channel'].value}")

db.commit()
db.close()
print("\nDone — 5 items created")