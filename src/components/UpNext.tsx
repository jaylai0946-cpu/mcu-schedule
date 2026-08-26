import { useMemo, useState } from 'react'
import { KIND_NAMES } from '../constants'
import { countdownLabel, daysUntil, todayISO } from '../lib/dates'
import type { NewTodoInput } from '../state'
import type { Course, ItemKind, TodoItem } from '../types'
import { TodoForm } from './TodoForm'

function tone(days: number): 'overdue' | 'soon' | 'normal' {
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'normal'
}

function sortKey(it: TodoItem): string {
  return `${it.date} ${it.time ?? '99:99'}`
}

interface Props {
  items: TodoItem[]
  courses: Course[]
  today: string
  defaultRemindDaysBefore: number
  onAdd: (input: NewTodoInput) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function UpNext({
  items,
  courses,
  today,
  defaultRemindDaysBefore,
  onAdd,
  onToggle,
  onDelete,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)

  const { pending, done } = useMemo(() => {
    const sorted = [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    return {
      pending: sorted.filter((it) => !it.done),
      done: sorted.filter((it) => it.done).reverse(),
    }
  }, [items])

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

      {pending.length === 0 ? (
        <p className="empty">目前沒有待辦。考試和作業排定了就按「＋ 新增」記下來。</p>
      ) : (
        <ul className="todo-list panel">
          {pending.map((it) => (
            <Row
              key={it.id}
              item={it}
              days={daysUntil(it.date)}
              courseName={courseName(it.courseId)}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="done-block">
          <summary>已完成（{done.length}）</summary>
          <ul className="todo-list panel">
            {done.map((it) => (
              <Row
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

function Row({
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
          <span className="tag">{KIND_NAMES[item.kind as ItemKind]}</span>
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
