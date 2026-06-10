from fastapi import FastAPI
from db import engine, Base
import models
from routers import (
    users, items, transactions, wallet, chat,
    dashboard, saved_items, wallet_summary,
    my_listings, my_purchases, notifications,
    profile, chat_extensions
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Campus Secure Marketplace",
    description="Token-based escrow marketplace for campus students.",
    version="1.0.0"
)

app.include_router(users.router)
app.include_router(wallet.router)
app.include_router(items.router)
app.include_router(transactions.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(saved_items.router)
app.include_router(wallet_summary.router)
app.include_router(my_listings.router)
app.include_router(my_purchases.router)
app.include_router(notifications.router)
app.include_router(profile.router)
app.include_router(chat_extensions.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Campus Marketplace API is running"}