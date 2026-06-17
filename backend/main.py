from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import engine, Base
from admin.admin_router import router as admin_router
from admin import admin_models
from routers import (
    users, items, transactions, wallet, chat,
    dashboard, saved_items, wallet_summary,
    my_listings, my_purchases, notifications,
    profile
)
from fastapi.staticfiles import StaticFiles


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Campus Secure Marketplace",
    description="Token-based escrow marketplace for campus students.",
    version="1.0.0"
)

#  CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

admin_models.Base.metadata.create_all(bind=engine)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(users.router)
app.include_router(wallet_summary.router)
app.include_router(wallet.router)
app.include_router(my_listings.router)
app.include_router(items.router)
app.include_router(transactions.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(saved_items.router)
app.include_router(admin_router)
app.include_router(my_purchases.router)
app.include_router(notifications.router)
app.include_router(profile.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Campus Marketplace API is running"}