import { useState } from 'react'
import { KIND_NAMES } from '../constants'
import { isValidDateString, isValidTimeString } from '../lib/dates'
import type { NewTodoInput } from '../state'
import type { Course, ItemKind } from '../types'

const KINDS = Object.keys(KIND_NAMES) as ItemKind[]

interface Props {
  courses: Course[]
  defaultDate: string
  defaultRemindDaysBefore: number
  onSubmit: (input: NewTodoInput) => void
  onCancel: () => void
}

export function TodoForm({
  courses,
  defaultDate,
  defaultRemindDaysBefore,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ItemKind>('hw')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [courseId, setCourseId] = useState('')
  const [note, setNote] = useState('')
  const [remind, setRemind] = useState(String(defaultRemindDaysBefore))
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('標題不能空白')
      return
    }
    if (!isValidDateString(date)) {
      setError('日期格式不對，要是實際存在的日期')
      return
    }
    if (time && !isValidTimeString(time)) {
      setError('時間格式不對')
      return
    }
    onSubmit({
      title: trimmed,
      kind,
      date,
      time: time || undefined,
      courseId: courseId || undefined,
      note: note.trim() || undefined,
      remindDaysBefore: Number(remind) >= 0 ? Number(remind) : undefined,
    })
  }

  return (
    // noValidate：用自己的中文錯誤訊息，不要瀏覽器各講各話的原生泡泡
    <form className="form panel" onSubmit={submit} noValidate>
      <div className="field field-wide">
        <label htmlFor="todo-title">標題</label>
        <input
          id="todo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="經濟學第一次期中考"
          autoFocus
          required
        />
      </div>

      <div className="field">
        <label htmlFor="todo-kind">類型</label>
        <select id="todo-kind" value={kind} onChange={(e) => setKind(e.target.value as ItemKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_NAMES[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="todo-date">日期</label>
        <input
          id="todo-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="todo-time">時間</label>
        <input id="todo-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="todo-course">科目</label>
        <select id="todo-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">不指定</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="todo-remind">提前幾天提醒</label>
        <input
          id="todo-remind"
          type="number"
          min="0"
          max="30"
          value={remind}
          onChange={(e) => setRemind(e.target.value)}
        />
      </div>

      <div className="field field-wide">
        <label htmlFor="todo-note">備註</label>
        <input
          id="todo-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="範圍第 1 到第 4 章"
        />
      </div>

      {error && <p className="form-error field-wide">{error}</p>}

      <div className="form-actions field-wide">
        <button type="submit" className="btn btn-primary">
          存檔
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <span className="section-note">按 Enter 也可以存檔</span>
      </div>
    </form>
  )
}
