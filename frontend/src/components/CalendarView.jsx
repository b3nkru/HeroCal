import { useRef, useMemo, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { fetchEvents } from '../api'

export default function CalendarView({
  visibleCalendars,
  refreshKey,
  onEventClick,
  onDateClick,
  onEventUpdate,
}) {
  const calRef = useRef(null)

  // Changing this dep causes FullCalendar to refetch from the new source
  const eventSources = useMemo(() => [{
    events: async (info, successCb, failureCb) => {
      try {
        const events = await fetchEvents(info.startStr, info.endStr, visibleCalendars)
        successCb(events)
      } catch (e) {
        failureCb(e)
      }
    },
  }], [visibleCalendars, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventDrop = async (info) => {
    const { account_id, calendar_id, google_id } = info.event.extendedProps
    try {
      await onEventUpdate(account_id, calendar_id, google_id, {
        start: info.event.start.toISOString(),
        end: info.event.end ? info.event.end.toISOString() : info.event.start.toISOString(),
        all_day: info.event.allDay,
      })
    } catch {
      info.revert()
    }
  }

  const handleEventResize = async (info) => {
    const { account_id, calendar_id, google_id } = info.event.extendedProps
    try {
      await onEventUpdate(account_id, calendar_id, google_id, {
        start: info.event.start.toISOString(),
        end: info.event.end.toISOString(),
        all_day: info.event.allDay,
      })
    } catch {
      info.revert()
    }
  }

  return (
    <div className="calendar-wrap">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        buttonText={{
          month: 'Month',
          week: 'Week',
          list: 'Agenda',
        }}
        editable
        selectable
        selectMirror
        dayMaxEvents
        eventSources={eventSources}
        eventClick={onEventClick}
        dateClick={onDateClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        height="100%"
      />
    </div>
  )
}
