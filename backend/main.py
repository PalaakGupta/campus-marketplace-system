from fastapi import FastAPI
from db import engine, Base
import models
from routers import users, items, transactions, wallet, chat

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Campus Secure Marketplace",
    description=(
        "A token-based escrow marketplace for campus students. "
        "Supports peer-to-peer marketplace listings and thrift store donations. "
        "All purchases are secured through a holding vault."
    ),
    version="1.0.0"
)

app.include_router(users.router)
app.include_router(wallet.router)
app.include_router(items.router)
app.include_router(transactions.router)
app.include_router(chat.router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Campus Marketplace API is running"}