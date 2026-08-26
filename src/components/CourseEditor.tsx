import { useState } from 'react'
import { LUNCH_PERIOD, WEEKDAY_NAMES } from '../constants'
import { courseColorStyle, splitContiguous, totalCredits } from '../lib/schedule'
import { periodSpanTime } from '../lib/dates'
import type { Course, Session, TodoItem } from '../types'
import { CourseForm } from './CourseForm'

function sessionSummary(s: Session): string {
  return splitContiguous(s.ps)
    .map((run) => {
      const { start, end } = periodSpanTime(run)
      const names = run.map((p) => (p === LUNCH_PERIOD ? '午' : p)).join(',')
      return `星期${WEEKDAY_NAMES[s.d]} ${names} 節　${start}–${end}　${s.room}`
    })
    .join(' ／ ')
}

interface Props {
  courses: Course[]
  items: TodoItem[]
  onSave: (course: Course) => void
  onDelete: (id: string) => void
}

export function CourseEditor({ courses, items, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const editing = courses.find((c) => c.id === editingId)

  return (
    <section className="section">
      <div className="section-head">
        <h2>編輯課表</h2>
        <span className="section-note">
          {courses.length} 門，共 {totalCredits(courses)} 學分
        </span>
      </div>

      {!adding && !editing && (
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          ＋ 新增課程
        </button>
      )}

      {adding && (
        <CourseForm
          courses={courses}
          onSave={(course) => {
            onSave(course)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="editor-list">
        {courses.map((course) => {
          const linked = items.filter((it) => it.courseId === course.id)
          const isEditing = editingId === course.id

          return (
            <div key={course.id} className="editor-row panel" style={courseColorStyle(course)}>
              <div className="editor-row-head">
                <span className="course-bar" />
                <div className="editor-row-main">
                  <div className="course-name">{course.name}</div>
                  <div className="editor-row-meta mono">
                    {course.code}　{course.teacher}　{course.credits} 學分
                  </div>
                  {course.sessions.map((s, i) => (
                    <div key={i} className="editor-row-meta mono">
                      {sessionSummary(s)}
                      {s.label ? `（${s.label}）` : ''}
                      {s.teacher ? `　${s.teacher}` : ''}
                    </div>
                  ))}
                </div>
                <div className="editor-row-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setEditingId(isEditing ? null : course.id)
                      setConfirmingId(null)
                      setAdding(false)
                    }}
                  >
                    {isEditing ? '收起' : '編輯'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setConfirmingId(confirmingId === course.id ? null : course.id)}
                  >
                    刪除
                  </button>
                </div>
              </div>

              {confirmingId === course.id && (
                <div className="confirm-box" role="alert">
                  <p>
                    確定要刪除「{course.name}」嗎？
                    {linked.length > 0 && (
                      <>
                        <br />
                        有 {linked.length} 筆待辦掛在這門課上。待辦不會被刪掉，只是科目欄會清空。
                      </>
                    )}
                  </p>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onDelete(course.id)
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
                <CourseForm
                  course={course}
                  courses={courses}
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

      {courses.length === 0 && <p className="empty">目前沒有任何課程。</p>}
    </section>
  )
}
