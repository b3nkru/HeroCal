import logging
import os

logging.basicConfig(level=logging.INFO)

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from app_auth import get_current_user, router as app_auth_router
from auth import router as auth_router
from calendar_service import router as cal_router

app = FastAPI(title="HeroCal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("APP_URL", "http://localhost:7777")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/app-auth/") or path == "/api/health":
        return await call_next(request)
    if path.startswith("/api/"):
        if not get_current_user(request):
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    return await call_next(request)


app.include_router(app_auth_router, prefix="/api/app-auth")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(cal_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
