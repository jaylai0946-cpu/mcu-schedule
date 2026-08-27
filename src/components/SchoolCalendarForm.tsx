import { useState } from 'react'
import { SCHOOL_EVENT_KIND_NAMES } from '../constants'
import { isValidDateString } from '../lib/dates'
import type { SchoolEvent, SchoolEventKind } from '../types'

const KINDS = Object.keys(SCHOOL_EVENT_KIND_NAMES) as SchoolEventKind[]

interface Props {
  event?: SchoolEvent
  defaultDate: string
  onSave: (event: SchoolEvent | (Omit<SchoolEvent, 'id'> & { id?: string })) => void
  onCancel: () => void
}

export function SchoolCalendarForm({ event, defaultDate, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [kind, setKind] = useState<SchoolEventKind>(event?.kind ?? 'exam')
  const [start, setStart] = useState(event?.start ?? defaultDate)
  const [end, setEnd] = useState(event?.end ?? '')
  const [note, setNote] = useState(event?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('標題不能空白')
    if (!isValidDateString(start)) return setError('開始日期格式不對，要是實際存在的日期')
    if (end && !isValidDateString(end)) return setError('結束日期格式不對')
    if (end && end < start) return setError('結束日期不能早於開始日期')

    onSave({
      id: event?.id,
      title: trimmed,
      kind,
      start,
      end: end && end > start ? end : undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <form className="form panel" onSubmit={submit} noValidate>
      <div className="field field-wide">
        <label htmlFor="school-title">標題</label>
        <input
          id="school-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="期中考週"
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="school-kind">類型</label>
        <select
          id="school-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as SchoolEventKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {SCHOOL_EVENT_KIND_NAMES[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="school-start">開始日</label>
        <input
          id="school-start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="school-end">結束日</label>
        <input id="school-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div className="field field-wide">
        <label htmlFor="school-note">備註</label>
        <input
          id="school-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="只有一天的話結束日留空"
        />
      </div>

      {error && (
        <p className="form-error field-wide" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions field-wide">
        <button type="submit" className="btn btn-primary">
          {event ? '儲存修改' : '新增'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
