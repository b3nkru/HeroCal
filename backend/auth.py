import os

import google.oauth2.credentials
import google_auth_oauthlib.flow
from googleapiclient.discovery import build
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from token_store import save_token, delete_token, load_tokens

# Allow HTTP for LAN deployments
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]

VALID_ACCOUNTS = {"account1", "account2", "account3"}


def _client_config() -> dict:
    return {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def _redirect_uri(account_id: str) -> str:
    base = os.getenv("APP_URL", "http://localhost:8080").rstrip("/")
    return f"{base}/api/auth/callback/{account_id}"


def get_flow(account_id: str) -> google_auth_oauthlib.flow.Flow:
    return google_auth_oauthlib.flow.Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=_redirect_uri(account_id),
    )


def build_credentials(account_id: str) -> google.oauth2.credentials.Credentials:
    data = load_tokens().get(account_id)
    if not data:
        raise HTTPException(401, f"{account_id} not connected")
    return google.oauth2.credentials.Credentials(
        token=data["token"],
        refresh_token=data.get("refresh_token"),
        token_uri=data["token_uri"],
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        scopes=data["scopes"],
    )


@router.get("/connect/{account_id}")
def connect(account_id: str):
    if account_id not in VALID_ACCOUNTS:
        raise HTTPException(400, "Invalid account ID")
    url, _ = get_flow(account_id).authorization_url(access_type="offline", prompt="consent")
    return RedirectResponse(url)


@router.get("/callback/{account_id}")
def callback(account_id: str, code: str):
    flow = get_flow(account_id)
    flow.fetch_token(code=code)
    creds = flow.credentials

    email = None
    try:
        svc = build("oauth2", "v2", credentials=creds)
        email = svc.userinfo().get().execute().get("email")
    except Exception:
        pass

    save_token(account_id, {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
        "email": email,
    })

    app_url = os.getenv("APP_URL", "http://localhost:8080").rstrip("/")
    return RedirectResponse(f"{app_url}?connected={account_id}")


@router.get("/status")
def status():
    tokens = load_tokens()
    return {
        aid: {"connected": aid in tokens, "email": tokens.get(aid, {}).get("email")}
        for aid in VALID_ACCOUNTS
    }


@router.delete("/disconnect/{account_id}")
def disconnect(account_id: str):
    delete_token(account_id)
    return {"ok": True}
