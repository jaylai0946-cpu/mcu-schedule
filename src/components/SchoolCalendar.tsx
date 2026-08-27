import { useState } from 'react'
import { SCHOOL_EVENT_KIND_NAMES, SEMESTER_DEFAULT } from '../constants'
import { formatDateWithWeekday, isValidDateString } from '../lib/dates'
import {
  eventLengthDays,
  formatRange,
  lastDay,
  schoolEventStatus,
  sortSchoolEvents,
} from '../lib/schoolCalendar'
import type { AppState, SchoolEvent } from '../types'
import { SchoolCalendarForm } from './SchoolCalendarForm'

interface Props {
  schoolEvents: SchoolEvent[]
  semester: AppState['semester']
  today: string
  onSave: (event: SchoolEvent | (Omit<SchoolEvent, 'id'> & { id?: string })) => void
  onDelete: (id: string) => void
  onSemesterChange: (patch: Partial<AppState['semester']>) => void
}

export function SchoolCalendar({
  schoolEvents,
  semester,
  today,
  onSave,
  onDelete,
  onSemesterChange,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const sorted = sortSchoolEvents(schoolEvents)
  const upcoming = sorted.filter((e) => !schoolEventStatus(e, today).finished)
  const past = sorted.filter((e) => schoolEventStatus(e, today).finished).reverse()

  const usingOfficialSemester =
    semester.start === SEMESTER_DEFAULT.start && semester.end === SEMESTER_DEFAULT.end

  // 可以拿來當學期起訖的候選日期：每筆事件的開始日與結束日
  const dateOptions = sorted.flatMap((e) =>
    e.end
      ? [
          { value: e.start, label: `${formatRange(e)} ${e.title}（開始）` },
          { value: e.end, label: `${formatRange(e)} ${e.title}（結束）` },
        ]
      : [{ value: e.start, label: `${formatRange(e)} ${e.title}` }],
  )

  return (
    <section className="section">
      <div className="section-head">
        <h2>重要日期</h2>
        <span className="section-note">{schoolEvents.length} 筆</span>
      </div>

      <div className="setting-block panel">
        <h3>學期起訖</h3>
        <p className="setting-desc">
          決定匯出的課程要每週重複到哪一天。可以直接改日期，或從下面登記過的重要日期挑一個帶入。
        </p>
        {!usingOfficialSemester && (
          <p className="notice">
            這組日期和官方行事曆（{SEMESTER_DEFAULT.start} 到 {SEMESTER_DEFAULT.end}）不一樣，
            是你自己改過的。
          </p>
        )}

        <div className="form">
          <div className="field">
            <label htmlFor="cal-start">開學日</label>
            <input
              id="cal-start"
              type="date"
              value={semester.start}
              onChange={(e) =>
                isValidDateString(e.target.value) && onSemesterChange({ start: e.target.value })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="cal-end">最後上課日</label>
            <input
              id="cal-end"
              type="date"
              value={semester.end}
              onChange={(e) =>
                isValidDateString(e.target.value) && onSemesterChange({ end: e.target.value })
              }
            />
          </div>

          {dateOptions.length > 0 && (
            <>
              <div className="field">
                <label htmlFor="cal-pick-start">從行事曆帶入開學日</label>
                <select
                  id="cal-pick-start"
                  value=""
                  onChange={(e) => e.target.value && onSemesterChange({ start: e.target.value })}
                >
                  <option value="">選一個日期</option>
                  {dateOptions.map((o, i) => (
                    <option key={`s${i}`} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="cal-pick-end">從行事曆帶入最後上課日</label>
                <select
                  id="cal-pick-end"
                  value=""
                  onChange={(e) => e.target.value && onSemesterChange({ end: e.target.value })}
                >
                  <option value="">選一個日期</option>
                  {dateOptions.map((o, i) => (
                    <option key={`e${i}`} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {!adding && !editingId && (
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          ＋ 新增重要日期
        </button>
      )}

      {adding && (
        <SchoolCalendarForm
          defaultDate={today}
          onSave={(event) => {
            onSave(event)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {schoolEvents.length === 0 && !adding && (
        <p className="empty">
          還沒登記任何學校日期。開學日、期中考週、期末考週、國定假日、補課日都可以記在這裡，
          <br />
          登記後會出現在首頁的「接下來」，也會一起匯出到系統行事曆。到「行事曆」分頁可以從官方行事曆一鍵加入。
        </p>
      )}

      <List
        title="即將到來"
        events={upcoming}
        today={today}
        editingId={editingId}
        confirmingId={confirmingId}
        setEditingId={setEditingId}
        setConfirmingId={setConfirmingId}
        onSave={onSave}
        onDelete={onDelete}
      />

      {past.length > 0 && (
        <details className="done-block">
          <summary>已經過去的（{past.length}）</summary>
          <List
            events={past}
            today={today}
            editingId={editingId}
            confirmingId={confirmingId}
            setEditingId={setEditingId}
            setConfirmingId={setConfirmingId}
            onSave={onSave}
            onDelete={onDelete}
          />
        </details>
      )}
    </section>
  )
}

function List({
  title,
  events,
  today,
  editingId,
  confirmingId,
  setEditingId,
  setConfirmingId,
  onSave,
  onDelete,
}: {
  title?: string
  events: SchoolEvent[]
  today: string
  editingId: string | null
  confirmingId: string | null
  setEditingId: (id: string | null) => void
  setConfirmingId: (id: string | null) => void
  onSave: Props['onSave']
  onDelete: (id: string) => void
}) {
  if (events.length === 0) return null

  return (
    <>
      {title && <h3 className="list-head">{title}</h3>}
      <div className="editor-list">
        {events.map((event) => {
          const status = schoolEventStatus(event, today)
          const isEditing = editingId === event.id
          const days = eventLengthDays(event)

          return (
            <div key={event.id} className="editor-row panel" data-tone={status.tone}>
              <div className="editor-row-head">
                <span className="event-bar" data-kind={event.kind} />
                <div className="editor-row-main">
                  <div className="course-name">{event.title}</div>
                  <div className="editor-row-meta mono">
                    {formatDateWithWeekday(event.start)}
                    {event.end && ` 到 ${formatDateWithWeekday(lastDay(event))}（共 ${days} 天）`}
                  </div>
                  <div className="editor-row-meta">
                    <span className="tag">{SCHOOL_EVENT_KIND_NAMES[event.kind]}</span>{' '}
                    <span data-tone={status.tone} className="event-status">
                      {status.label}
                      {status.detail ? `（${status.detail}）` : ''}
                    </span>
                    {event.note && `　${event.note}`}
                  </div>
                </div>
                <div className="editor-row-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setEditingId(isEditing ? null : event.id)
                      setConfirmingId(null)
                    }}
                  >
                    {isEditing ? '收起' : '編輯'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setConfirmingId(confirmingId === event.id ? null : event.id)}
                  >
                    刪除
                  </button>
                </div>
              </div>

              {confirmingId === event.id && (
                <div className="confirm-box" role="alert">
                  <p>確定要刪除「{event.title}」嗎？</p>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onDelete(event.id)
                        setConfirmingId(null)
                        if (isEditing) setEditingId(null)
                      }}
                    >
                      確定刪除
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmingId(null)}>
                      取消
                    </button>
                  </div>
                </div>
              )}

              {isEditing && (
                <SchoolCalendarForm
                  event={event}
                  defaultDate={today}
                  onSave={(updated) => {
                    onSave(updated)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
