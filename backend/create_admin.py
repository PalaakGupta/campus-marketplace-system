# File: create_admin.py

"""
Run this script once to create the first admin account.
Usage: python create_admin.py
"""
from db import SessionLocal
from admin.admin_service import seed_admin

if __name__ == "__main__":
    db = SessionLocal()
    try:
        admin = seed_admin(
            db=db,
            admin_id="ADMIN001",
            name="System Administrator",
            email="admin@dei.ac.in",
            password="Admin@123456",
        )
        print(f"Admin created: {admin.admin_id} / {admin.name}")
        print("Login at: /admin/login")
        print("ID: ADMIN001  Password: Admin@123456")
    finally:
        db.close()