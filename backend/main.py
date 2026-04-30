from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.audit_routes import router as audit_router
from api.vision_routes import router as vision_router
from api.finance_routes import router as finance_router

app = FastAPI(
    title="Audit-AI API",
    description="Smart inventory + finance auditing system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit_router, prefix="/audit", tags=["Audit"])
app.include_router(vision_router, prefix="/vision", tags=["Vision"])
app.include_router(finance_router, prefix="/finance", tags=["Finance"])


@app.get("/")
def health():
    return {"status": "ok", "service": "audit-ai"}
