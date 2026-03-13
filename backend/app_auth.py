import base64
import os

import google_auth_oauthlib.flow
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from googleapiclient.discovery import build
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from passlib.context import CryptContext
from pydantic import BaseModel

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_COOKIE = "herocal_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 days

APP_AUTH_SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email"]


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(os.environ.get("SESSION_SECRET", "change-me"))


def create_session(response: Response, username: str):
    token = _serializer().dumps({"user": username})
    secure = os.getenv("APP_URL", "").startswith("https")
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=secure,
    )


def get_current_user(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        data = _serializer().loads(token, max_age=SESSION_MAX_AGE)
        return data.get("user")
    except (BadSignature, SignatureExpired):
        return None


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginBody, response: Response):
    expected_user = os.environ.get("APP_USERNAME", "")
    encoded_hash = os.environ.get("APP_PASSWORD_HASH", "")
    try:
        expected_hash = base64.b64decode(encoded_hash).decode()
    except Exception:
        expected_hash = ""
    if not expected_hash or body.username != expected_user or not pwd_context.verify(body.password, expected_hash):
        raise HTTPException(401, "Invalid credentials")
    create_session(response, body.username)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {"user": user}


def _google_flow() -> google_auth_oauthlib.flow.Flow:
    app_url = os.getenv("APP_URL", "http://localhost:7777").rstrip("/")
    config = {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return google_auth_oauthlib.flow.Flow.from_client_config(
        config,
        scopes=APP_AUTH_SCOPES,
        redirect_uri=f"{app_url}/api/app-auth/google/callback",
    )


@router.get("/google")
def google_login():
    url, _ = _google_flow().authorization_url(prompt="select_account")
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str):
    flow = _google_flow()
    flow.fetch_token(code=code)
    svc = build("oauth2", "v2", credentials=flow.credentials)
    email = svc.userinfo().get().execute().get("email", "")

    allowed = os.environ.get("ALLOWED_GOOGLE_EMAILS", "")
    allowed_emails = {e.strip() for e in allowed.split(",") if e.strip()}
    if email not in allowed_emails:
        raise HTTPException(403, "Email not authorized")

    app_url = os.getenv("APP_URL", "http://localhost:7777").rstrip("/")
    resp = RedirectResponse(f"{app_url}/")
    create_session(resp, email)
    return resp
