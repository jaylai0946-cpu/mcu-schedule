import { Fragment } from 'react'
import { LUNCH_PERIOD, PERIOD_ORDER, PERIOD_TIMES, WEEKDAYS, WEEKDAY_NAMES } from '../constants'
import { weekdayOf } from '../lib/dates'
import { buildWeekLayout, classesOnWeekday, courseColorStyle } from '../lib/schedule'
import type { Course } from '../types'

export function WeekSchedule({ courses, today }: { courses: Course[]; today: string }) {
  const { blocks, occupied, emptyDays } = buildWeekLayout(courses)
  const todayWeekday = weekdayOf(today)

  return (
    <section className="section">
      <div className="section-head">
        <h2>週課表</h2>
        <span className="section-note">節次 1-8，午休（午）夾在第 4、5 節之間</span>
      </div>

      {/* 桌機：格狀表格 */}
      <div className="scroll-x only-desktop">
        <div className="week-grid">
          <div className="week-head" style={{ gridColumn: 1, gridRow: 1 }} aria-hidden="true" />
          {WEEKDAYS.map((d) => (
            <div
              key={`head-${d}`}
              className="week-head"
              data-today={d === todayWeekday}
              style={{ gridColumn: d + 1, gridRow: 1 }}
            >
              星期{WEEKDAY_NAMES[d]}
            </div>
          ))}

          {PERIOD_ORDER.map((p, i) => (
            <Fragment key={`row-${p}`}>
              <div
                className="week-time"
                data-lunch={p === LUNCH_PERIOD}
                style={{ gridColumn: 1, gridRow: i + 2 }}
              >
                <b>{p === LUNCH_PERIOD ? '午' : p}</b>
                {PERIOD_TIMES[p].start}
                <br />
                {PERIOD_TIMES[p].end}
              </div>
              {WEEKDAYS.map((d) =>
                occupied.has(`${d}-${i}`) || emptyDays.includes(d) ? null : (
                  <div
                    key={`slot-${d}-${p}`}
                    className="week-slot"
                    data-lunch={p === LUNCH_PERIOD}
                    style={{ gridColumn: d + 1, gridRow: i + 2 }}
                  />
                ),
              )}
            </Fragment>
          ))}

          {/* 整天沒課：一個貫穿整欄的虛線框 */}
          {emptyDays.map((d) => (
            <div
              key={`free-${d}`}
              className="week-empty-day"
              style={{ gridColumn: d + 1, gridRow: '2 / -1' }}
            >
              整天沒課
            </div>
          ))}

          {/* 跨節的課是一個完整色塊，不是分開的數格 */}
          {blocks.map((b) => (
            <div
              key={b.key}
              className="week-block"
              style={{
                gridColumn: b.d + 1,
                gridRow: `${b.rowStart + 2} / span ${b.rowSpan}`,
                ...courseColorStyle(b.course),
              }}
            >
              <div className="week-block-name">
                {b.course.name}
                {b.session.label ? `（${b.session.label}）` : ''}
              </div>
              <div className="week-block-meta">
                {b.start}–{b.end}
                <br />
                {b.session.room}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 手機：一天一段的清單 */}
      <div className="week-days only-mobile">
        {WEEKDAYS.map((d) => {
          const classes = classesOnWeekday(courses, d)
          return (
            <div key={`day-${d}`}>
              <div className="day-head" data-today={d === todayWeekday}>
                <h3>星期{WEEKDAY_NAMES[d]}</h3>
                <span>{classes.length === 0 ? '整天沒課' : `${classes.length} 堂`}</span>
              </div>
              {classes.length === 0 ? (
                <p className="day-empty">整天沒課</p>
              ) : (
                classes.map((c) => (
                  <div key={c.key} className="day-row" style={courseColorStyle(c.course)}>
                    <div className="day-row-time">
                      {c.start}–{c.end}
                      <b>
                        {c.ps.map((p) => (p === LUNCH_PERIOD ? '午' : p)).join(',')} 節
                      </b>
                    </div>
                    <div>
                      <div className="day-row-name">
                        {c.course.name}
                        {c.session.label ? `（${c.session.label}）` : ''}
                      </div>
                      <div className="day-row-meta">
                        {c.teacher}　{c.session.room}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      <div className="legend">
        <span>
          <i data-kind="class" />
          有課
        </span>
        <span>
          <i data-kind="slot" />
          空堂
        </span>
        <span>
          <i data-kind="lunch" />
          午休／班會
        </span>
      </div>
    </section>
  )
}
