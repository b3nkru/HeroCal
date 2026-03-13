# HeroCal

A self-hosted Google Calendar viewer for multiple accounts, running in Docker on a Raspberry Pi.

## Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API**:
   - APIs & Services → Library → search "Google Calendar API" → Enable
4. Enable the **Google People API** (for fetching email addresses):
   - APIs & Services → Library → search "Google People API" → Enable
   _(or use "OAuth2 API" — the `userinfo.email` endpoint)_
5. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → **OAuth client ID**
   - Application type: **Web application**
   - Name: HeroCal (or anything)
   - Authorized redirect URIs — add **all three** of these (one per account slot):
     ```
     http://<YOUR_PI_IP>:7777/api/auth/callback/account1
     http://<YOUR_PI_IP>:7777/api/auth/callback/account2
     http://<YOUR_PI_IP>:7777/api/auth/callback/account3
     ```
   - Copy the **Client ID** and **Client Secret**

6. Configure the OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User type: **External** (unless you have Google Workspace)
   - Add your three Google account email addresses as **Test users**

### 2. Configure the App

```bash
cp .env.example .env
```

Edit `.env`:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
APP_URL=http://192.168.1.x:7777   # your Pi's LAN IP
```

### 3. Build and Run

```bash
docker compose up -d --build
```

Open `http://<PI_IP>:7777` in your browser.

### 4. Connect Your Google Accounts

In the sidebar, click **Connect** next to each account slot and sign in with the corresponding Google account. After authorizing, you'll be redirected back and the calendars will appear.

## Usage

| Feature | How |
|---|---|
| Switch views | Month / Week / Agenda buttons (top right) |
| Create event | Click any date or time slot |
| Edit event | Click on an event |
| Delete event | Click event → Delete button |
| Toggle calendars | Checkboxes in the sidebar |
| Toggle all for an account | ◉ button next to the account |
| Drag to reschedule | Drag & drop events |
| Resize to change duration | Drag the bottom edge of an event (week view) |

## Updating

```bash
docker compose pull
docker compose up -d --build
```

Tokens are stored in `./data/tokens.json` and persist across container restarts.
