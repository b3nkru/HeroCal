const BASE = '/api'

export class UnauthorizedError extends Error {}

async function req(path, options = {}) {
  const res = await fetch(BASE + path, { credentials: 'same-origin', ...options })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function getMe() {
  return req('/app-auth/me')
}

export async function loginUser(username, password) {
  return req('/app-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export async function logoutUser() {
  return req('/app-auth/logout', { method: 'POST' })
}

export async function getAuthStatus() {
  return req('/auth/status')
}

export async function disconnectAccount(accountId) {
  return req(`/auth/disconnect/${accountId}`, { method: 'DELETE' })
}

export async function getCalendars() {
  return req('/calendars')
}

export async function fetchEvents(start, end, visibleCalendarIds) {
  const params = new URLSearchParams({ start, end })
  if (visibleCalendarIds && visibleCalendarIds.size > 0) {
    params.set('calendar_ids', [...visibleCalendarIds].join(','))
  }
  const events = await req(`/events?${params}`)
  return events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: {
      google_id: e.google_id,
      calendar_id: e.calendar_id,
      account_id: e.account_id,
      description: e.description,
      location: e.location,
      meet_link: e.meet_link ?? null,
    },
  }))
}

export async function createEvent(body) {
  return req('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function updateEvent(accountId, calendarId, eventId, body) {
  const params = new URLSearchParams({ calendar_id: calendarId })
  return req(`/events/${accountId}/${eventId}?${params}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteEvent(accountId, calendarId, eventId) {
  const params = new URLSearchParams({ calendar_id: calendarId })
  return req(`/events/${accountId}/${eventId}?${params}`, { method: 'DELETE' })
}
