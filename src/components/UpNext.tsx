import { useMemo, useState } from 'react'
import { KIND_NAMES, SCHOOL_EVENT_KIND_NAMES } from '../constants'
import { countdownLabel, daysUntil, todayISO } from '../lib/dates'
import { formatRange, schoolEventStatus, upcomingSchoolEvents } from '../lib/schoolCalendar'
import type { NewTodoInput } from '../state'
import type { Course, SchoolEvent, TodoItem } from '../types'
import { TodoForm } from './TodoForm'

function tone(days: number): 'overdue' | 'soon' | 'normal' {
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'normal'
}

type Entry =
  | { type: 'todo'; sortKey: string; item: TodoItem }
  | { type: 'school'; sortKey: string; event: SchoolEvent }

interface Props {
  items: TodoItem[]
  courses: Course[]
  schoolEvents: SchoolEvent[]
  today: string
  defaultRemindDaysBefore: number
  onAdd: (input: NewTodoInput) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onOpenCalendar: () => void
}

export function UpNext({
  items,
  courses,
  schoolEvents,
  today,
  defaultRemindDaysBefore,
  onAdd,
  onToggle,
  onDelete,
  onOpenCalendar,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)

  const { entries, done } = useMemo(() => {
    const todos: Entry[] = items
      .filter((it) => !it.done)
      .map((item) => ({ type: 'todo', sortKey: `${item.date} ${item.time ?? '99:99'}`, item }))

    // 學校行事曆排在同一天的待辦前面，因為它是「今天的背景」而不是某個時刻的事
    const school: Entry[] = upcomingSchoolEvents(schoolEvents, today).map((event) => ({
      type: 'school',
      sortKey: `${event.start} 00:00`,
      event,
    }))

    // 進行中的區間（開始日已過）要一直待在最上面，不能因為日期舊了就沉下去
    const ongoing = school.filter((e) => e.type === 'school' && schoolEventStatus(e.event, today).ongoing)
    const rest = [...school.filter((e) => !ongoing.includes(e)), ...todos].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey),
    )

    return {
      entries: [...ongoing, ...rest],
      done: items
        .filter((it) => it.done)
        .sort((a, b) => b.date.localeCompare(a.date)),
    }
  }, [items, schoolEvents, today])

  const courseName = (id?: string) => courses.find((c) => c.id === id)?.name

  return (
    <section className="section">
      <div className="section-head">
        <h2>接下來</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setFormOpen((v) => !v)}
          aria-expanded={formOpen}
        >
          {formOpen ? '收起' : '＋ 新增'}
        </button>
      </div>

      {formOpen && (
        <TodoForm
          courses={courses}
          defaultDate={todayISO()}
          defaultRemindDaysBefore={defaultRemindDaysBefore}
          onSubmit={(input) => {
            onAdd(input)
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {entries.length === 0 ? (
        <p className="empty">
          目前沒有待辦。考試和作業排定了就按「＋ 新增」記下來，
          <br />
          學校的開學日、考試週、放假日則到「重要日期」分頁登記。
        </p>
      ) : (
        <ul className="todo-list panel">
          {entries.map((entry) =>
            entry.type === 'todo' ? (
              <TodoRow
                key={entry.item.id}
                item={entry.item}
                days={daysUntil(entry.item.date)}
                courseName={courseName(entry.item.courseId)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ) : (
              <SchoolRow
                key={entry.event.id}
                event={entry.event}
                today={today}
                onOpenCalendar={onOpenCalendar}
              />
            ),
          )}
        </ul>
      )}

      {done.length > 0 && (
        <details className="done-block">
          <summary>已完成（{done.length}）</summary>
          <ul className="todo-list panel">
            {done.map((it) => (
              <TodoRow
                key={it.id}
                item={it}
                days={daysUntil(it.date, new Date(`${today}T00:00:00Z`))}
                courseName={courseName(it.courseId)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function TodoRow({
  item,
  days,
  courseName,
  onToggle,
  onDelete,
}: {
  item: TodoItem
  days: number
  courseName?: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className="todo-row" data-done={item.done}>
      <span className="todo-countdown" data-tone={item.done ? 'normal' : tone(days)}>
        {countdownLabel(days)}
      </span>
      <div className="todo-main">
        <div className="todo-title">{item.title}</div>
        <div className="todo-sub">
          <span className="tag">{KIND_NAMES[item.kind]}</span>
          {courseName && <span className="tag">{courseName}</span>}
          <span className="mono">
            {item.date}
            {item.time ? ` ${item.time}` : ''}
          </span>
          {item.note && <span>{item.note}</span>}
        </div>
      </div>
      <div className="todo-actions">
        <button type="button" className="btn" onClick={() => onToggle(item.id)}>
          {item.done ? '復原' : '完成'}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onDelete(item.id)}>
          刪除
        </button>
      </div>
    </li>
  )
}

function SchoolRow({
  event,
  today,
  onOpenCalendar,
}: {
  event: SchoolEvent
  today: string
  onOpenCalendar: () => void
}) {
  const status = schoolEventStatus(event, today)

  return (
    <li className="todo-row" data-school="true">
      <span className="todo-countdown" data-tone={status.tone}>
        {status.label}
      </span>
      <div className="todo-main">
        <div className="todo-title">{event.title}</div>
        <div className="todo-sub">
          <span className="tag tag-school">學校</span>
          <span className="tag">{SCHOOL_EVENT_KIND_NAMES[event.kind]}</span>
          <span className="mono">{formatRange(event)}</span>
          {status.detail && <span className="event-status">{status.detail}</span>}
          {event.note && <span>{event.note}</span>}
          <button type="button" className="link-btn" onClick={onOpenCalendar}>
            編輯
          </button>
        </div>
      </div>
    </li>
  )
}
