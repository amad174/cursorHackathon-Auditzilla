from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.models.schemas import VisionAnalyseResponse
from backend.services.vision_service import VisionService

router = APIRouter()
vision_service = VisionService()


@router.post("/analyse", response_model=VisionAnalyseResponse)
async def analyse_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    return vision_service.analyse_image(image_bytes=image_bytes, filename=file.filename or "upload.jpg")
