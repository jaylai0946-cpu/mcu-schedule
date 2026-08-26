import { WEEKDAY_NAMES } from '../constants'
import { weekdayOf } from '../lib/dates'
import { classesOnWeekday, courseColorStyle } from '../lib/schedule'
import type { Course } from '../types'

export function TodayClasses({ courses, today }: { courses: Course[]; today: string }) {
  const weekday = weekdayOf(today)
  const classes = weekday === null ? [] : classesOnWeekday(courses, weekday)

  return (
    <section className="section">
      <div className="section-head">
        <h2>今天的課</h2>
        {weekday !== null && classes.length > 0 && (
          <span className="section-note">
            星期{WEEKDAY_NAMES[weekday]}，共 {classes.length} 堂
          </span>
        )}
      </div>

      {weekday === null ? (
        <p className="empty">週末沒有排課，好好休息。</p>
      ) : classes.length === 0 ? (
        <p className="empty">今天整天沒課。</p>
      ) : (
        <div className="today-list">
          {classes.map((c) => (
            <article key={c.key} className="today-card" style={courseColorStyle(c.course)}>
              <div className="today-time">
                {c.start}
                <br />
                {c.end}
              </div>
              <div>
                <div className="today-name">
                  {c.course.name}
                  {c.session.label ? `（${c.session.label}）` : ''}
                </div>
                <div className="today-where">
                  {c.session.room}　{c.teacher}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
