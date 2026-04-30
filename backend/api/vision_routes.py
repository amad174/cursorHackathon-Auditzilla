from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/analyse")
async def analyse_image(file: UploadFile = File(...)):
    """Stub endpoint — returns mock vision analysis results."""
    return {
        "filename": file.filename,
        "annotated_image_url": None,
        "items": [
            {"item": "Red Bull", "count": 24, "confidence": 0.87},
            {"item": "Coca-Cola", "count": 48, "confidence": 0.91},
            {"item": "Heineken", "count": 12, "confidence": 0.76},
        ],
        "source": "mock",
    }
