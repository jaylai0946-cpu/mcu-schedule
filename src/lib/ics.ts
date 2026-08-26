import { KIND_NAMES, LUNCH_PERIOD } from '../constants'
import type { AppState, Course, TodoItem, Weekday } from '../types'
import { addDays, periodSpanTime, weekdayIndex } from './dates'
import { splitContiguous } from './schedule'

const CRLF = '\r\n'
const TZID = 'Asia/Taipei'
/** 台北是固定的 UTC+8，1980 年後沒有日光節約，所以只需要一個 STANDARD。 */
const TZ_OFFSET_HOURS = 8
const DOMAIN = 'mcu-schedule.local'

const BYDAY: Record<Weekday, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR' }

/** RFC 5545 的文字跳脫：反斜線、分號、逗號、換行。 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * 折行到 75 octet。中文一個字 3 bytes，所以要數位元組不是字元，
 * 而且不能把一個字從中間切開。
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const parts: string[] = []
  let current = ''
  let bytes = 0

  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > 75) {
      parts.push(current)
      current = ` ${ch}` // 續行開頭要有一個空白
      bytes = 1 + size
    } else {
      current += ch
      bytes += size
    }
  }
  parts.push(current)
  return parts.join(CRLF)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 'YYYY-MM-DD' -> 'YYYYMMDD' */
function dateValue(iso: string): string {
  return iso.replace(/-/g, '')
}

/** 本地時間值（搭配 TZID 使用）：'YYYYMMDDTHHMMSS' */
function localDateTime(iso: string, time: string): string {
  return `${dateValue(iso)}T${time.replace(':', '')}00`
}

/** UTC 值：'YYYYMMDDTHHMMSSZ' */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * 學期最後一天的 23:59:59（台北）換算成 UTC。
 * DTSTART 帶 TZID 時，RRULE 的 UNTIL 一定要是 UTC，否則 Google 會整條規則吃掉。
 */
function untilValue(endISO: string): string {
  const [y, m, d] = endISO.split('-').map(Number)
  return utcStamp(new Date(Date.UTC(y, m - 1, d, 23 - TZ_OFFSET_HOURS, 59, 59)))
}

/** 學期開始後第一個落在該星期的日期。 */
export function firstOccurrence(startISO: string, d: Weekday): string {
  const delta = (d - weekdayIndex(startISO) + 7) % 7
  return addDays(startISO, delta)
}

function vtimezone(): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${TZID}`,
    `X-LIC-LOCATION:${TZID}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
}

function courseEvents(courses: Course[], semester: AppState['semester'], stamp: string): string[] {
  const lines: string[] = []

  for (const course of courses) {
    for (const [si, session] of course.sessions.entries()) {
      // 一段連續節次 = 一個事件，開始是第一節、結束是最後一節
      for (const [ri, run] of splitContiguous(session.ps).entries()) {
        const { start, end } = periodSpanTime(run)
        const first = firstOccurrence(semester.start, session.d)
        const teacher = session.teacher ?? course.teacher
        const periods = run.map((p) => (p === LUNCH_PERIOD ? '午休' : `第 ${p} 節`)).join('、')

        const description = [
          teacher && `教師：${teacher}`,
          course.code && `課號：${course.code}`,
          periods,
          session.label,
          course.note,
        ]
          .filter(Boolean)
          .join('\n')

        lines.push(
          'BEGIN:VEVENT',
          `UID:course-${course.id}-${si}-${ri}@${DOMAIN}`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${TZID}:${localDateTime(first, start)}`,
          `DTEND;TZID=${TZID}:${localDateTime(first, end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[session.d]};UNTIL=${untilValue(semester.end)}`,
          `SUMMARY:${escapeText(course.name + (session.label ? `（${session.label}）` : ''))}`,
          `LOCATION:${escapeText(session.room)}`,
          `DESCRIPTION:${escapeText(description)}`,
          'END:VEVENT',
        )
      }
    }
  }

  return lines
}

function alarmTrigger(days: number): string {
  return days > 0 ? `-P${days}D` : '-PT0M'
}

function itemEvents(items: TodoItem[], courses: Course[], state: AppState, stamp: string): string[] {
  const lines: string[] = []

  for (const item of items) {
    const course = courses.find((c) => c.id === item.courseId)
    const remind = item.remindDaysBefore ?? state.settings.defaultRemindDaysBefore
    const description = [
      `類型：${KIND_NAMES[item.kind]}`,
      course && `科目：${course.name}`,
      item.note,
    ]
      .filter(Boolean)
      .join('\n')

    lines.push('BEGIN:VEVENT', `UID:item-${item.id}@${DOMAIN}`, `DTSTAMP:${stamp}`)

    if (item.time) {
      const [h, m] = item.time.split(':').map(Number)
      const endTime = `${pad((h + 1) % 24)}:${pad(m)}`
      const endDate = h + 1 >= 24 ? addDays(item.date, 1) : item.date
      lines.push(
        `DTSTART;TZID=${TZID}:${localDateTime(item.date, item.time)}`,
        `DTEND;TZID=${TZID}:${localDateTime(endDate, endTime)}`,
      )
    } else {
      // 沒填時間就當成全天事件。DTEND 是隔天，這是 iCalendar 的慣例（不含結束日）
      lines.push(
        `DTSTART;VALUE=DATE:${dateValue(item.date)}`,
        `DTEND;VALUE=DATE:${dateValue(addDays(item.date, 1))}`,
      )
    }

    lines.push(
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:${alarmTrigger(remind)}`,
      `DESCRIPTION:${escapeText(item.title)}`,
      'END:VALARM',
      'END:VEVENT',
    )
  }

  return lines
}

export interface ICSOptions {
  includeCourses?: boolean
  includeItems?: boolean
  /** 只給測試用，讓 DTSTAMP 可預測 */
  now?: Date
}

export function buildICS(state: AppState, options: ICSOptions = {}): string {
  const { includeCourses = true, includeItems = true, now = new Date() } = options
  const stamp = utcStamp(now)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//mcu-schedule//課表與待辦//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${state.profile.klass} 課表`)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...vtimezone(),
    ...(includeCourses ? courseEvents(state.courses, state.semester, stamp) : []),
    ...(includeItems ? itemEvents(state.items, state.courses, state, stamp) : []),
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join(CRLF) + CRLF
}

/** 用 Blob + <a download> 觸發下載。 */
export function downloadICS(content: string, filename = 'mcu-schedule.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
