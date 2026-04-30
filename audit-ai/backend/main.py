from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.vision_routes import router as vision_router

app = FastAPI(title="Audit AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
