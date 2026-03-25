import { useState, useEffect } from 'react'

function toLocalInput(isoStr, allDay) {
  if (!isoStr) return ''
  if (allDay) return isoStr.slice(0, 10)
  const d = new Date(isoStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toISO(inputVal, allDay) {
  if (!inputVal) return ''
  if (allDay) return inputVal
  return new Date(inputVal).toISOString()
}

function formatDateRange(start, end, allDay) {
  if (!start) return ''
  const s = new Date(start)
  const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
  if (allDay) {
    const e = end ? new Date(end) : null
    const sStr = s.toLocaleDateString(undefined, opts)
    if (!e || e.toDateString() === s.toDateString()) return sStr
    return `${sStr} — ${e.toLocaleDateString(undefined, opts)}`
  }
  const timeOpts = { hour: 'numeric', minute: '2-digit' }
  const sStr = s.toLocaleDateString(undefined, opts)
  const sTime = s.toLocaleTimeString(undefined, timeOpts)
  if (!end) return `${sStr} at ${sTime}`
  const e = new Date(end)
  const eTime = e.toLocaleTimeString(undefined, timeOpts)
  if (s.toDateString() === e.toDateString()) return `${sStr}, ${sTime} – ${eTime}`
  return `${sStr} ${sTime} — ${e.toLocaleDateString(undefined, opts)} ${eTime}`
}

function InfoView({ event, calendars, onEdit, onDelete, onClose }) {
  const cal = calendars.find(c => c.id === event.calendar_id)
  const calLabel = cal ? `${cal.accountEmail} — ${cal.summary}` : null

  return (
    <>
      <div className="modal-header">
        <h2 className="info-title">{event.title || '(No title)'}</h2>
        <div className="modal-header-actions">
          <button className="btn-ghost icon-btn" title="Edit" onClick={onEdit}>✎</button>
          <button className="btn-ghost modal-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="modal-body info-body">
        <div className="info-row">
          <span className="info-icon">🗓</span>
          <span>{formatDateRange(event.start, event.end, event.allDay)}</span>
        </div>

        {calLabel && (
          <div className="info-row">
            <span className="info-icon">📅</span>
            <span>{calLabel}</span>
          </div>
        )}

        {event.location && (
          <div className="info-row">
            <span className="info-icon">📍</span>
            <span>{event.location}</span>
          </div>
        )}

        {event.description && (
          <div className="info-row info-row--top">
            <span className="info-icon">≡</span>
            <span className="info-description">{event.description}</span>
          </div>
        )}

        {event.meet_link && (
          <a
            className="btn-meet"
            href={event.meet_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: 8, flexShrink: 0}}>
              <path d="M44 14l-9 9V25l9 9V14z" fill="#00832d"/>
              <path d="M4 11v26a3 3 0 003 3h26a3 3 0 003-3V11a3 3 0 00-3-3H7a3 3 0 00-3 3z" fill="#00832d"/>
            </svg>
            Join with Google Meet
          </a>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-danger" onClick={() => onDelete(event)}>Delete</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={onEdit}>Edit</button>
      </div>
    </>
  )
}

function EditView({ event, calendars, onSave, onDelete, onClose, isNew }) {
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [calKey, setCalKey] = useState('')
  const [addMeet, setAddMeet] = useState(false)

  useEffect(() => {
    setTitle(event.title ?? '')
    setAllDay(event.allDay ?? false)
    setStart(toLocalInput(event.start, event.allDay))
    setEnd(toLocalInput(event.end, event.allDay))
    setDescription(event.description ?? '')
    setLocation(event.location ?? '')
    setAddMeet(false)
    if (event.account_id && event.calendar_id) {
      setCalKey(`${event.account_id}||${event.calendar_id}`)
    } else if (calendars.length > 0) {
      setCalKey(`${calendars[0].account_id}||${calendars[0].id}`)
    }
  }, [event, calendars])

  const handleAllDayToggle = (checked) => {
    setAllDay(checked)
    if (start) setStart(checked ? start.slice(0, 10) : start.slice(0, 10) + 'T09:00')
    if (end) setEnd(checked ? end.slice(0, 10) : end.slice(0, 10) + 'T10:00')
  }

  const handleSave = () => {
    const [accId, calId] = calKey.split('||')
    onSave({
      ...event,
      title,
      start: toISO(start, allDay),
      end: toISO(end, allDay),
      allDay,
      description,
      location,
      account_id: accId,
      calendar_id: calId,
      add_meet: addMeet,
    })
  }

  return (
    <>
      <div className="modal-header">
        <h2>{isNew ? 'New Event' : 'Edit Event'}</h2>
        <button className="btn-ghost modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        <input
          className="input-title"
          type="text"
          placeholder="Event title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />

        <label className="checkbox-row">
          <input type="checkbox" checked={allDay} onChange={e => handleAllDayToggle(e.target.checked)} />
          All day
        </label>

        <div className="time-row">
          <div className="field">
            <label>Start</label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div className="field">
            <label>End</label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </div>
        </div>

        {isNew && calendars.length > 0 && (
          <div className="field">
            <label>Calendar</label>
            <select value={calKey} onChange={e => setCalKey(e.target.value)}>
              {calendars.map(c => (
                <option key={`${c.account_id}||${c.id}`} value={`${c.account_id}||${c.id}`}>
                  {c.accountEmail} — {c.summary}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Description</label>
          <textarea
            placeholder="Add description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="field">
          <label>Location</label>
          <input
            type="text"
            placeholder="Add location"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        {!isNew && event.meet_link && (
          <a
            className="btn-meet"
            href={event.meet_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: 8, flexShrink: 0}}>
              <path d="M44 14l-9 9V25l9 9V14z" fill="#00832d"/>
              <path d="M4 11v26a3 3 0 003 3h26a3 3 0 003-3V11a3 3 0 00-3-3H7a3 3 0 00-3 3z" fill="#00832d"/>
            </svg>
            Join with Google Meet
          </a>
        )}

        {isNew && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={addMeet}
              onChange={e => setAddMeet(e.target.checked)}
            />
            Add Google Meet video conferencing
          </label>
        )}
      </div>

      <div className="modal-footer">
        {!isNew && (
          <button className="btn btn-danger" onClick={() => onDelete(event)}>Delete</button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isNew ? 'Create' : 'Save'}
        </button>
      </div>
    </>
  )
}

export default function EventModal({ event, calendars, onClose, onSave, onDelete }) {
  const isNew = !event?.google_id
  const [mode, setMode] = useState(isNew ? 'edit' : 'info')

  useEffect(() => {
    setMode(isNew ? 'edit' : 'info')
  }, [event, isNew])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {mode === 'info'
          ? <InfoView event={event} calendars={calendars} onEdit={() => setMode('edit')} onDelete={onDelete} onClose={onClose} />
          : <EditView event={event} calendars={calendars} onSave={onSave} onDelete={onDelete} onClose={onClose} isNew={isNew} />
        }
      </div>
    </div>
  )
}
