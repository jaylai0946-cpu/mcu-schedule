import { Fragment } from 'react'
import { WEEK_ZOOM_MAX, WEEK_ZOOM_MIN, useWeekView } from '../useWeekView'
import { LUNCH_PERIOD, PERIOD_ORDER, PERIOD_TIMES, WEEKDAYS, WEEKDAY_NAMES } from '../constants'
import { weekdayOf } from '../lib/dates'
import { buildWeekLayout, classesOnWeekday, courseColorStyle } from '../lib/schedule'
import type { Course } from '../types'

export function WeekSchedule({
  courses,
  today,
  campus = '台北校區',
}: {
  courses: Course[]
  today: string
  campus?: string
}) {
  const { blocks, occupied, emptyDays } = buildWeekLayout(courses)
  const todayWeekday = weekdayOf(today)

  const { mode, zoom, setMode, zoomIn, zoomOut, resetZoom } = useWeekView()

  // 一門課有兩個以上時段（例如會計學的正課與實習）容易看錯，在表格下面講清楚
  const multiSessionNotes = courses
    .filter((c) => c.sessions.length > 1)
    .map(
      (c) =>
        `${c.name}${c.sessions
          .map(
            (sess) =>
              `星期${WEEKDAY_NAMES[sess.d]}為${sess.label ?? '正課'}（${sess.room}${
                sess.teacher ? `，${sess.teacher}` : ''
              }）`,
          )
          .join('、')}`,
    )

  return (
    <section className="section" data-week-view={mode}>
      <div className="section-head">
        <h2>週課表</h2>
        <span className="section-note">節次 1-8，午休（午）夾在第 4、5 節之間</span>
      </div>

      {/* 手機才需要選：桌機一律格子 */}
      <div className="week-view-bar">
        <div className="chip-row">
          <button
            type="button"
            className="period-chip almanac-tab"
            aria-pressed={mode === 'grid'}
            onClick={() => setMode('grid')}
          >
            格子
          </button>
          <button
            type="button"
            className="period-chip almanac-tab"
            aria-pressed={mode === 'list'}
            onClick={() => setMode('list')}
          >
            清單
          </button>
        </div>

        {mode === 'grid' && (
          <div className="zoom-controls" role="group" aria-label="課表縮放">
            <button
              type="button"
              className="btn"
              onClick={zoomOut}
              disabled={zoom <= WEEK_ZOOM_MIN}
              aria-label="課表縮小"
            >
              －
            </button>
            <span className="zoom-value mono">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="btn"
              onClick={zoomIn}
              disabled={zoom >= WEEK_ZOOM_MAX}
              aria-label="課表放大"
            >
              ＋
            </button>
            <button type="button" className="btn" onClick={resetZoom}>
              重設
            </button>
          </div>
        )}
      </div>

      <div className="scroll-x week-grid-wrap">
        <div style={{ zoom }} className="week-grid">
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
                <b>{p}</b>
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
              <span className="week-empty-main">整天沒課</span>
              <span className="week-empty-sub">FREE DAY</span>
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
                {b.session.teacher ?? b.course.teacher}
                {'　'}
                {b.session.room}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 一天一段的清單 */}
      <div className="week-days week-list-wrap">
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
                        {c.ps.join(',')} 節
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

      <div className="week-footnotes">
        <p>
          <b>時間（{campus}）</b>
          <span className="mono">
            {PERIOD_ORDER.map((p) => `${p === LUNCH_PERIOD ? '20' : p} = ${PERIOD_TIMES[p].start}`)
              .join('、')}
          </span>
          ，每節 50 分鐘。20 為午休／班會時段。
        </p>
        {multiSessionNotes.length > 0 && (
          <p>
            <b>注意</b>
            {multiSessionNotes.map((note, i) => (
              <span key={note}>
                {i > 0 && '；'}
                {note}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}
