
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from db import SessionLocal
from models import User, Wallet, UserRole
from auth import hash_password
from datetime import date
import uuid

db = SessionLocal()

users_to_create = [
    {
        "login_id"      : "ADMIN001",
        "name"          : "Campus Admin",
        "email"         : "admin@campus.edu",
        "date_of_birth" : date(2000, 1, 1),  # password: 01012000
        "role"          : UserRole.admin
    },
    {
        "login_id"      : "CS2021001",
        "name"          : "Priya Singh",
        "email"         : "priya@campus.edu",
        "date_of_birth" : date(2003, 8, 15),  # password: 15082003
        "role"          : UserRole.student
    },
    {
        "login_id"      : "CS2021002",
        "name"          : "Rahul Sharma",
        "email"         : "rahul@campus.edu",
        "date_of_birth" : date(2002, 3, 22),  # password: 22032002
        "role"          : UserRole.student
    },
    {
        "login_id"      : "PROF001",
        "name"          : "Dr. Amara Osei",
        "email"         : "amara@campus.edu",
        "date_of_birth" : date(1980, 6, 10),  # password: 10061980
        "role"          : UserRole.professor
    },
    {
        "login_id"      : "TA001",
        "name"          : "Kwame Asante",
        "email"         : "kwame@campus.edu",
        "date_of_birth" : date(1998, 11, 5),  # password: 05111998
        "role"          : UserRole.teaching_assistant
    },
    {
        "login_id"      : "LAB001",
        "name"          : "Meena Patel",
        "email"         : "meena@campus.edu",
        "date_of_birth" : date(1990, 4, 18),  # password: 18041990
        "role"          : UserRole.lab_staff
    },
    {
        "login_id"      : "STAFF001",
        "name"          : "Ravi Kumar",
        "email"         : "ravi@campus.edu",
        "date_of_birth" : date(1985, 9, 30),  # password: 30091985
        "role"          : UserRole.administrative_staff
    },
]

print("\n Campus Marketplace — Seeding Users\n" + "="*45)

created = 0
skipped = 0

for u in users_to_create:
    existing = db.query(User).filter(
        User.login_id == u["login_id"]
    ).first()

    if existing:
        print(f"  SKIP  {u['role'].value:<25} {u['login_id']} — already exists")
        skipped += 1
        continue

    password     = u["date_of_birth"].strftime("%d%m%Y")
    is_admin     = u["role"] == UserRole.admin

    new_user = User(
        id            = str(uuid.uuid4()),
        login_id      = u["login_id"],
        name          = u["name"],
        email         = u["email"],
        password_hash = hash_password(password),
        role          = u["role"],
        is_active     = True,
        is_verified   = is_admin
    )
    db.add(new_user)
    db.flush()

    wallet = Wallet(
        id      = str(uuid.uuid4()),
        user_id = new_user.id,
        balance = 1000.00 if u["role"] == UserRole.student else 0.00
    )
    db.add(wallet)
    created += 1
    print(f"  OK    {u['role'].value:<25} {u['login_id']:<12} password: {password}")

db.commit()
db.close()

print("="*45)
print(f"  Created: {created}   Skipped: {skipped}")
print()
print("  Login credentials summary:")
print("  ─────────────────────────────────────────────")
print(f"  {'Role':<25} {'Login ID':<12} {'Password'}")
print("  ─────────────────────────────────────────────")
for u in users_to_create:
    pw = u["date_of_birth"].strftime("%d%m%Y")
    print(f"  {u['role'].value:<25} {u['login_id']:<12} {pw}")
print("  ─────────────────────────────────────────────\n")