import { formatMinutes, kickerText, nextClassToday } from '../lib/nextClass'
import { weekdayName } from '../lib/dates'
import type { Course } from '../types'

/** 「9月7日（月）」——日期用日系寫法，星期照中文的一到五。 */
function jpDate(today: string): string {
  const [, m, d] = today.split('-')
  return `${Number(m)}月${Number(d)}日（${weekdayName(today).replace('星期', '')}）`
}

/**
 * 首頁最上面那張卡：今天幾堂、下一堂是什麼。
 * 資料都是現成的，不需要新的 state。
 */
export function TodaySummary({ courses, today }: { courses: Course[]; today: string }) {
  const info = nextClassToday(courses, today)
  const cls = info.cls

  return (
    <section className="today-summary panel">
      <div className="today-summary-head">
        <span className="mono">{jpDate(today)}</span>
        <span className="muted">今天 {info.count} 堂</span>
      </div>

      <div className="today-summary-next">
        <div className="today-kicker">
          {kickerText(info)}
          {info.minutes !== undefined && (
            <span className="mono">{formatMinutes(info.minutes)}</span>
          )}
        </div>
        {cls ? (
          <>
            <div className="today-name">
              {cls.course.name}
              {cls.session.label ? `（${cls.session.label}）` : ''}
            </div>
            <div className="today-where">
              {cls.start}–{cls.end}　{cls.session.room || '教室未定'}　{cls.teacher}
            </div>
          </>
        ) : (
          <div className="today-name">
            {info.status === 'done' ? '辛苦了，回家吧' : '好好休息'}
          </div>
        )}
      </div>
    </section>
  )
}
