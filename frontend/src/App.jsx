import { useEffect, useState, useCallback } from 'react'
import {
  getAuthStatus,
  getCalendars,
  createEvent,
  updateEvent,
  deleteEvent,
  disconnectAccount,
} from './api'
import Sidebar from './components/Sidebar'
import CalendarView from './components/CalendarView'
import EventModal from './components/EventModal'

export default function App() {
  const [accounts, setAccounts] = useState({})
  const [calendars, setCalendars] = useState([])
  const [visibleCalendars, setVisibleCalendars] = useState(new Set())
  const [modalEvent, setModalEvent] = useState(null) // null = closed
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    try {
      const [statusMap, cals] = await Promise.all([getAuthStatus(), getCalendars()])
      setAccounts(statusMap)
      const enriched = cals.map(c => ({
        ...c,
        accountEmail: statusMap[c.account_id]?.email || c.account_id,
      }))
      setCalendars(enriched)
      setVisibleCalendars(prev => {
        // Keep existing visible state; add new calendars as visible
        const next = new Set(prev)
        enriched.forEach(c => next.add(c.id))
        return next
      })
    } catch (e) {
      console.error('loadData error', e)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Handle redirect after OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) {
      window.history.replaceState({}, '', '/')
    }
  }, [loadData])

  const handleToggleCalendar = (calId) => {
    setVisibleCalendars(prev => {
      const next = new Set(prev)
      next.has(calId) ? next.delete(calId) : next.add(calId)
      return next
    })
  }

  const handleToggleAccount = (accountId) => {
    const accountCals = calendars.filter(c => c.account_id === accountId).map(c => c.id)
    const allVisible = accountCals.every(id => visibleCalendars.has(id))
    setVisibleCalendars(prev => {
      const next = new Set(prev)
      accountCals.forEach(id => allVisible ? next.delete(id) : next.add(id))
      return next
    })
  }

  const handleDisconnect = async (accountId) => {
    await disconnectAccount(accountId)
    await loadData()
    setRefreshKey(k => k + 1)
  }

  const handleEventClick = (info) => {
    setModalEvent({
      google_id: info.event.extendedProps.google_id,
      calendar_id: info.event.extendedProps.calendar_id,
      account_id: info.event.extendedProps.account_id,
      title: info.event.title,
      start: info.event.start?.toISOString() ?? '',
      end: (info.event.end ?? info.event.start)?.toISOString() ?? '',
      allDay: info.event.allDay,
      description: info.event.extendedProps.description ?? '',
      location: info.event.extendedProps.location ?? '',
      meet_link: info.event.extendedProps.meet_link ?? null,
    })
  }

  const handleDateClick = (info) => {
    const start = info.date
    const end = info.allDay ? info.date : new Date(info.date.getTime() + 60 * 60 * 1000)
    const defaultCal = calendars.find(c => visibleCalendars.has(c.id))
    setModalEvent({
      title: '',
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: info.allDay,
      description: '',
      location: '',
      calendar_id: defaultCal?.id ?? '',
      account_id: defaultCal?.account_id ?? '',
    })
  }

  const handleEventUpdate = async (accountId, calendarId, googleId, patch) => {
    await updateEvent(accountId, calendarId, googleId, patch)
    setRefreshKey(k => k + 1)
  }

  const handleSave = async (data) => {
    if (data.google_id) {
      await updateEvent(data.account_id, data.calendar_id, data.google_id, {
        title: data.title,
        start: data.start,
        end: data.end,
        all_day: data.allDay,
        description: data.description,
        location: data.location,
      })
    } else {
      await createEvent({
        account_id: data.account_id,
        calendar_id: data.calendar_id,
        title: data.title,
        start: data.start,
        end: data.end,
        all_day: data.allDay,
        description: data.description,
        location: data.location,
        add_meet: data.add_meet ?? false,
      })
    }
    setModalEvent(null)
    setRefreshKey(k => k + 1)
  }

  const handleDelete = async (data) => {
    await deleteEvent(data.account_id, data.calendar_id, data.google_id)
    setModalEvent(null)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="app">
      <Sidebar
        accounts={accounts}
        calendars={calendars}
        visibleCalendars={visibleCalendars}
        onToggleCalendar={handleToggleCalendar}
        onToggleAccount={handleToggleAccount}
        onDisconnect={handleDisconnect}
      />
      <main className="main">
        <CalendarView
          visibleCalendars={visibleCalendars}
          refreshKey={refreshKey}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventUpdate={handleEventUpdate}
        />
      </main>
      {modalEvent !== null && (
        <EventModal
          event={modalEvent}
          calendars={calendars}
          onClose={() => setModalEvent(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
