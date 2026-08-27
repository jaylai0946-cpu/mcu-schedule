import { useState } from 'react'
import { HUE_PRESETS, PERIOD_ORDER, PERIOD_TIMES, WEEKDAYS, WEEKDAY_NAMES } from '../constants'
import { describeConflict, detectConflicts } from '../lib/conflicts'
import { sortPeriods } from '../lib/dates'
import type { Course, Period, Session, Weekday } from '../types'

function emptySession(): Session {
  return { d: 1, ps: [], room: '' }
}

function newCourseId(existing: Course[]): string {
  let n = existing.length + 1
  while (existing.some((c) => c.id === `c${n}`)) n += 1
  return `c${n}`
}

interface Props {
  /** 有值代表編輯，沒有代表新增 */
  course?: Course
  courses: Course[]
  onSave: (course: Course) => void
  onCancel: () => void
}

export function CourseForm({ course, courses, onSave, onCancel }: Props) {
  const [name, setName] = useState(course?.name ?? '')
  const [code, setCode] = useState(course?.code ?? '')
  const [teacher, setTeacher] = useState(course?.teacher ?? '')
  const [credits, setCredits] = useState(String(course?.credits ?? 2))
  const [hueIndex, setHueIndex] = useState(() => {
    const i = HUE_PRESETS.findIndex((p) => p.hue === course?.hue && p.sat === course?.sat)
    return i >= 0 ? i : 0
  })
  const [note, setNote] = useState(course?.note ?? '')
  const [sessions, setSessions] = useState<Session[]>(
    course ? structuredClone(course.sessions) : [emptySession()],
  )
  const [errors, setErrors] = useState<string[]>([])

  function patchSession(index: number, patch: Partial<Session>) {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function togglePeriod(index: number, p: Period) {
    setSessions((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        const has = s.ps.includes(p)
        return { ...s, ps: sortPeriods(has ? s.ps.filter((x) => x !== p) : [...s.ps, p]) }
      }),
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const problems: string[] = []

    if (!trimmedName) problems.push('課名不能空白')
    if (sessions.length === 0) problems.push('至少要有一個上課時段')
    sessions.forEach((s, i) => {
      if (s.ps.length === 0) problems.push(`第 ${i + 1} 個時段還沒選節次`)
      if (!s.room.trim()) problems.push(`第 ${i + 1} 個時段還沒填教室`)
    })

    if (problems.length > 0) {
      setErrors(problems)
      return
    }

    const preset = HUE_PRESETS[hueIndex]
    const draft: Course = {
      id: course?.id ?? newCourseId(courses),
      name: trimmedName,
      code: code.trim(),
      teacher: teacher.trim(),
      credits: Number(credits) || 0,
      hue: preset.hue,
      sat: preset.sat,
      note: note.trim() || undefined,
      sessions: sessions.map((s) => ({
        d: s.d,
        ps: sortPeriods(s.ps),
        room: s.room.trim(),
        label: s.label?.trim() || undefined,
        teacher: s.teacher?.trim() || undefined,
      })),
    }

    const conflicts = detectConflicts(draft, courses)
    if (conflicts.length > 0) {
      setErrors(conflicts.map(describeConflict))
      return
    }

    onSave(draft)
  }

  return (
    <form className="form panel course-form" onSubmit={submit} noValidate>
      <div className="field field-wide">
        <label htmlFor="course-name">課名</label>
        <input id="course-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="course-code">課號</label>
        <input id="course-code" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="course-teacher">教師</label>
        <input id="course-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="course-credits">學分</label>
        <input
          id="course-credits"
          type="number"
          min="0"
          max="10"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="course-note">備註</label>
        <input id="course-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="field field-wide">
        <span className="field-legend">顏色</span>
        <div className="chip-row">
          {HUE_PRESETS.map((preset, i) => (
            <button
              key={`${preset.hue}-${preset.sat}`}
              type="button"
              className="hue-chip"
              aria-pressed={i === hueIndex}
              aria-label={preset.name}
              onClick={() => setHueIndex(i)}
              style={{
                '--c-bg': `hsl(${preset.hue} ${preset.sat}% 94%)`,
                '--c-bar': `hsl(${preset.hue} ${Math.min(100, preset.sat + 14)}% 52%)`,
              } as React.CSSProperties}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field-wide">
        <div className="sessions-head">
          <span className="field-legend">上課時段</span>
          <button
            type="button"
            className="btn"
            onClick={() => setSessions((prev) => [...prev, emptySession()])}
          >
            ＋ 加一個時段
          </button>
        </div>

        {sessions.map((s, i) => (
          <fieldset className="session-box" key={i}>
            <legend>時段 {i + 1}</legend>

            <div className="session-grid">
              <div className="field">
                <label htmlFor={`session-day-${i}`}>星期</label>
                <select
                  id={`session-day-${i}`}
                  value={s.d}
                  onChange={(e) => patchSession(i, { d: Number(e.target.value) as Weekday })}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d} value={d}>
                      星期{WEEKDAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor={`session-room-${i}`}>教室</label>
                <input
                  id={`session-room-${i}`}
                  value={s.room}
                  onChange={(e) => patchSession(i, { room: e.target.value })}
                />
              </div>

              <div className="field">
                <label htmlFor={`session-label-${i}`}>標註</label>
                <input
                  id={`session-label-${i}`}
                  value={s.label ?? ''}
                  placeholder="例如 實習"
                  onChange={(e) => patchSession(i, { label: e.target.value })}
                />
              </div>

              <div className="field">
                <label htmlFor={`session-teacher-${i}`}>這段的教師</label>
                <input
                  id={`session-teacher-${i}`}
                  value={s.teacher ?? ''}
                  placeholder="與課程相同就留空"
                  onChange={(e) => patchSession(i, { teacher: e.target.value })}
                />
              </div>
            </div>

            <span className="field-legend">節次（20 = 午休／班會，排在第 4、5 節中間）</span>
            <div className="chip-row">
              {PERIOD_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="period-chip"
                  aria-pressed={s.ps.includes(p)}
                  onClick={() => togglePeriod(i, p)}
                  title={`${PERIOD_TIMES[p].start}–${PERIOD_TIMES[p].end}`}
                >
                  {p}
                </button>
              ))}
            </div>

            {sessions.length > 1 && (
              <button
                type="button"
                className="btn btn-danger session-remove"
                onClick={() => setSessions((prev) => prev.filter((_, x) => x !== i))}
              >
                移除這個時段
              </button>
            )}
          </fieldset>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="form-error field-wide" role="alert">
          {errors.map((msg) => (
            <div key={msg}>{msg}</div>
          ))}
        </div>
      )}

      <div className="form-actions field-wide">
        <button type="submit" className="btn btn-primary">
          {course ? '儲存修改' : '新增課程'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
