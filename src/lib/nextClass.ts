import { nowTime, timeToMinutes, weekdayOf } from './dates'
import { classesOnWeekday, type DayClass } from './schedule'
import type { Course } from '../types'

export type NextStatus = 'ongoing' | 'next' | 'done' | 'none'

export interface NextClassInfo {
  status: NextStatus
  /** 進行中或下一堂那一堂；今天沒課、或今天的課都上完了就沒有 */
  cls?: DayClass
  /** 距離開始還有幾分鐘（進行中的是距離下課） */
  minutes?: number
  /** 今天總共幾堂 */
  count: number
}

/** 「還有 1 小時 20 分」「還有 15 分」。 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `還有 ${minutes} 分`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `還有 ${h} 小時` : `還有 ${h} 小時 ${m} 分`
}

export function kickerText(info: NextClassInfo): string {
  if (info.status === 'ongoing') return '正在上課'
  if (info.status === 'next') return '下一堂'
  if (info.status === 'done') return '今天的課上完了'
  return '今天沒有課'
}

/**
 * 今天還有什麼課。待遞補的課還沒真的選上，不拿來當「下一堂」。
 */
export function nextClassToday(
  courses: Course[],
  today: string,
  now: string = nowTime(),
): NextClassInfo {
  const weekday = weekdayOf(today)
  if (weekday === null) return { status: 'none', count: 0 }

  const classes = classesOnWeekday(courses, weekday).filter((c) => !c.course.waitlisted)
  if (classes.length === 0) return { status: 'none', count: 0 }

  const minutes = timeToMinutes(now)
  const ongoing = classes.find(
    (c) => timeToMinutes(c.start) <= minutes && minutes < timeToMinutes(c.end),
  )
  if (ongoing) {
    return {
      status: 'ongoing',
      cls: ongoing,
      minutes: timeToMinutes(ongoing.end) - minutes,
      count: classes.length,
    }
  }

  const upcoming = classes.find((c) => timeToMinutes(c.start) > minutes)
  if (upcoming) {
    return {
      status: 'next',
      cls: upcoming,
      minutes: timeToMinutes(upcoming.start) - minutes,
      count: classes.length,
    }
  }

  return { status: 'done', count: classes.length }
}
