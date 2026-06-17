from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from auth import get_current_user
from envelope import success
import schemas
import models
import services
from db import get_db
from fastapi import UploadFile, File
from typing import List
import shutil, os

router = APIRouter(
    prefix="/items",
    tags=["Items"]
)


@router.post(
    "/",
    response_model=schemas.ItemResponse,
    status_code=201,
    summary="List a new item for sale"
)
def create_item(
    payload: schemas.ItemCreate,
    seller_id: str = Query(..., description="ID of the seller"),
    db: Session = Depends(get_db)
):
    return services.create_item(db, seller_id, payload)



@router.get(
    "/{item_id}",
    response_model=schemas.ItemResponse,
    summary="Get a single item by ID"
)
def get_item(
    item_id: str,
    db: Session = Depends(get_db)
):
    return services.get_item_by_id(db, item_id)

@router.get("/")
def get_items(
    channel:  Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    search:   Optional[str] = Query(default=None),
    page:     int           = Query(default=1, ge=1),
    page_size:int           = Query(default=20, alias="pageSize"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    if channel:
        channel = channel.lower().replace(" ", "_")
    return success(services.get_items(db, channel, category, search))

@router.post("/{item_id}/view")
def increment_view(item_id: str, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item:
        item.view_count += 1
        db.commit()
    return success({"message": "View counted"})

@router.post("/{item_id}/images")
async def upload_images(
    item_id: str,
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    os.makedirs("static/images", exist_ok=True)
    urls = []
    for img in images:
        filename = f"{item_id}_{img.filename}"
        path = f"static/images/{filename}"
        with open(path, "wb") as f:
            shutil.copyfileobj(img.file, f)
        urls.append(f"/static/images/{filename}")
    
    # Save first image as item image_url
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item and urls:
        item.image_url = urls[0]
        db.commit()
    
    return success({"urls": urls})