import { SCHOOL_EVENT_LOOKAHEAD_DAYS } from '../constants'
import type { SchoolEvent } from '../types'
import { countdownLabel, diffDays, todayISO } from './dates'

/** 區間的最後一天；單日事件就是 start。 */
export function lastDay(event: SchoolEvent): string {
  return event.end ?? event.start
}

export function sortSchoolEvents(events: SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start) || lastDay(a).localeCompare(lastDay(b)))
}

export type EventTone = 'overdue' | 'soon' | 'ongoing' | 'normal'

export interface SchoolEventStatus {
  /** 距離開始還有幾天。已經開始的是負數或 0 */
  days: number
  /** 倒數欄要用的短標籤，最多四個字，不然窄螢幕會被擠成三行 */
  label: string
  /** 補充說明，放在下面那行 */
  detail?: string
  tone: EventTone
  ongoing: boolean
  /** 整段都結束了 */
  finished: boolean
}

export function schoolEventStatus(event: SchoolEvent, today = todayISO()): SchoolEventStatus {
  const days = diffDays(today, event.start)
  const endDiff = diffDays(today, lastDay(event))
  const ongoing = days <= 0 && endDiff >= 0
  const finished = endDiff < 0

  if (ongoing) {
    // 多天的區間進行中時，講「還剩幾天」比講「幾天前開始」有用
    const detail = event.end && endDiff > 0 ? `還有 ${endDiff} 天結束` : undefined
    return { days, label: '進行中', detail, tone: 'ongoing', ongoing, finished }
  }

  return {
    days,
    label: countdownLabel(days),
    tone: finished ? 'overdue' : days <= 3 ? 'soon' : 'normal',
    ongoing,
    finished,
  }
}

/** 還沒結束、而且在 lookahead 天內就會開始的（進行中的一定算）。 */
export function upcomingSchoolEvents(
  events: SchoolEvent[],
  today = todayISO(),
  lookaheadDays = SCHOOL_EVENT_LOOKAHEAD_DAYS,
): SchoolEvent[] {
  return sortSchoolEvents(events).filter((event) => {
    const status = schoolEventStatus(event, today)
    return !status.finished && status.days <= lookaheadDays
  })
}

/** 顯示用的日期文字：'11/09' 或 '11/09–11/13'。 */
export function formatRange(event: SchoolEvent): string {
  const short = (iso: string) => iso.slice(5).replace('-', '/')
  return event.end ? `${short(event.start)}–${short(event.end)}` : short(event.start)
}

/** 區間跨幾天（含頭尾）。 */
export function eventLengthDays(event: SchoolEvent): number {
  return diffDays(event.start, lastDay(event)) + 1
}
