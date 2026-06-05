from fastapi import FastAPI
from db import engine, Base
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Campus Marketplace System",
    description="A token-based escrow marketplace for campus students.",
    version="0.1.0"
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Campus Marketplace API is running"}