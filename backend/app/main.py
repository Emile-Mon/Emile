from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.api.endpoints import router as api_router
from app.api.websocket import router as ws_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Émile — Autonomous agent observing Solana token survival on pump.fun"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local thumbnails static directory
os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)
app.mount("/thumbnails", StaticFiles(directory=settings.STORAGE_LOCAL_PATH), name="thumbnails")

# Include routers
app.include_router(api_router)
app.include_router(ws_router)

@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.services.ingest_worker import start_ingest_worker_loop
    asyncio.create_task(start_ingest_worker_loop())

@app.get("/")
async def root():
    return {
        "status": "online",
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
