from typing import Optional

import google.auth.transport.requests
from fastapi import APIRouter
from googleapiclient.discovery import build
from pydantic import BaseModel

from auth import build_credentials
from token_store import load_tokens, save_token

router = APIRouter()

VALID_ACCOUNTS = ["account1", "account2", "account3"]


def _refresh_and_save(account_id: str, creds):
    if creds.expired and creds.refresh_token:
        creds.refresh(google.auth.transport.requests.Request())
        data = load_tokens().get(account_id, {})
        data["token"] = creds.token
        save_token(account_id, data)
    return creds


def _service(account_id: str):
    creds = build_credentials(account_id)
    creds = _refresh_and_save(account_id, creds)
    return build("calendar", "v3", credentials=creds)


@router.get("/calendars")
def list_calendars():
    result = []
    tokens = load_tokens()
    for aid in VALID_ACCOUNTS:
        if aid not in tokens:
            continue
        try:
            items = _service(aid).calendarList().list().execute().get("items", [])
            for c in items:
                result.append({
                    "id": c["id"],
                    "account_id": aid,
                    "summary": c.get("summary", ""),
                    "backgroundColor": c.get("backgroundColor", "#4285f4"),
                    "primary": c.get("primary", False),
                })
        except Exception:
            pass
    return result


@router.get("/events")
def get_events(start: str, end: str, calendar_ids: Optional[str] = None):
    tokens = load_tokens()
    cal_filter = set(calendar_ids.split(",")) if calendar_ids else None
    events = []

    for aid in VALID_ACCOUNTS:
        if aid not in tokens:
            continue
        try:
            svc = _service(aid)
            cals = svc.calendarList().list().execute().get("items", [])
            for cal in cals:
                if cal_filter and cal["id"] not in cal_filter:
                    continue
                items = svc.events().list(
                    calendarId=cal["id"],
                    timeMin=start,
                    timeMax=end,
                    singleEvents=True,
                    orderBy="startTime",
                ).execute().get("items", [])
                color = cal.get("backgroundColor", "#4285f4")
                for e in items:
                    s, en = e["start"], e["end"]
                    all_day = "date" in s
                    events.append({
                        "id": f"{aid}__{cal['id']}__{e['id']}",
                        "google_id": e["id"],
                        "calendar_id": cal["id"],
                        "account_id": aid,
                        "title": e.get("summary", "(No title)"),
                        "start": s.get("dateTime", s.get("date")),
                        "end": en.get("dateTime", en.get("date")),
                        "allDay": all_day,
                        "description": e.get("description", ""),
                        "location": e.get("location", ""),
                        "color": color,
                    })
        except Exception:
            pass
    return events


class EventBody(BaseModel):
    title: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    all_day: Optional[bool] = False
    description: Optional[str] = ""
    location: Optional[str] = ""
    account_id: Optional[str] = None
    calendar_id: Optional[str] = None


@router.post("/events")
def create_event(body: EventBody):
    svc = _service(body.account_id)
    event = {
        "summary": body.title,
        "description": body.description,
        "location": body.location,
    }
    if body.all_day:
        event["start"] = {"date": body.start[:10]}
        event["end"] = {"date": body.end[:10]}
    else:
        event["start"] = {"dateTime": body.start}
        event["end"] = {"dateTime": body.end}
    return svc.events().insert(calendarId=body.calendar_id, body=event).execute()


@router.put("/events/{account_id}/{event_id}")
def update_event(account_id: str, event_id: str, calendar_id: str, body: EventBody):
    svc = _service(account_id)
    existing = svc.events().get(calendarId=calendar_id, eventId=event_id).execute()
    if body.title is not None:
        existing["summary"] = body.title
    if body.description is not None:
        existing["description"] = body.description
    if body.location is not None:
        existing["location"] = body.location
    if body.start is not None:
        if body.all_day:
            existing["start"] = {"date": body.start[:10]}
        else:
            existing["start"] = {"dateTime": body.start}
    if body.end is not None:
        if body.all_day:
            existing["end"] = {"date": body.end[:10]}
        else:
            existing["end"] = {"dateTime": body.end}
    return svc.events().update(calendarId=calendar_id, eventId=event_id, body=existing).execute()


@router.delete("/events/{account_id}/{event_id}")
def delete_event(account_id: str, event_id: str, calendar_id: str):
    _service(account_id).events().delete(calendarId=calendar_id, eventId=event_id).execute()
    return {"ok": True}
