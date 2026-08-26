import { PERIOD_ORDER, PERIOD_TIMES, WEEKDAY_NAMES } from '../constants'
import type { Period, Weekday } from '../types'

export const TIME_ZONE = 'Asia/Taipei'

const ISO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const ISO_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 今天（台北）的 'YYYY-MM-DD'。 */
export function todayISO(now: Date = new Date()): string {
  return ISO_DATE_FORMATTER.format(now)
}

/** 現在（台北）的 'HH:mm'。 */
export function nowTime(now: Date = new Date()): string {
  return ISO_TIME_FORMATTER.format(now)
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d))
  // 擋掉 2026-02-30 這種會被 Date 靜靜進位的日期
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * 把 'YYYY-MM-DD' 當成 UTC 午夜來表示「那一天」。
 * 全程用 UTC 是刻意的：日曆日的相減不該被時區偏移或日光節約影響。
 */
function toUTCDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

const DAY_MS = 86_400_000

/** 相差幾個日曆日（toISO - fromISO）。同一天是 0，明天是 1。 */
export function diffDays(fromISO: string, toISO: string): number {
  return Math.round((toUTCDay(toISO) - toUTCDay(fromISO)) / DAY_MS)
}

/** 從今天（台北）算到 targetISO 還有幾天。過期為負數。 */
export function daysUntil(targetISO: string, now: Date = new Date()): number {
  return diffDays(todayISO(now), targetISO)
}

/** 倒數文案：今天 / 明天 / N 天後 / N 天前。 */
export function countdownLabel(days: number): string {
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days > 1) return `${days} 天後`
  return `${-days} 天前`
}

/** 把 iso 往後推 n 天，回傳 'YYYY-MM-DD'。 */
export function addDays(iso: string, n: number): string {
  const next = new Date(toUTCDay(iso) + n * DAY_MS)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate(),
  ).padStart(2, '0')}`
}

/** ISO 日期是星期幾，0 = 星期日。 */
export function weekdayIndex(iso: string): number {
  return new Date(toUTCDay(iso)).getUTCDay()
}

/** 只在平日回傳 Weekday，週末回 null。 */
export function weekdayOf(iso: string): Weekday | null {
  const idx = weekdayIndex(iso)
  return idx >= 1 && idx <= 5 ? (idx as Weekday) : null
}

const FULL_WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayName(iso: string): string {
  return `星期${FULL_WEEKDAY_NAMES[weekdayIndex(iso)]}`
}

export function formatDateWithWeekday(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)} 月 ${Number(d)} 日 ${weekdayName(iso)}`
}

export function periodLabel(d: Weekday, ps: Period[]): string {
  const sorted = sortPeriods(ps)
  const names = sorted.map((p) => (p === 20 ? '午' : String(p)))
  return `${WEEKDAY_NAMES[d]} ${names.join(',')} 節`
}

/** 依課表顯示順序（1,2,3,4,20,5,6,7,8）排序，不是數字大小。 */
export function sortPeriods(ps: Period[]): Period[] {
  return [...ps].sort((a, b) => PERIOD_ORDER.indexOf(a) - PERIOD_ORDER.indexOf(b))
}

/** 一段連續節次的起訖時間：第一節開始到最後一節結束。 */
export function periodSpanTime(ps: Period[]): { start: string; end: string } {
  const sorted = sortPeriods(ps)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return { start: PERIOD_TIMES[first].start, end: PERIOD_TIMES[last].end }
}

/** 'HH:mm' 轉成當日分鐘數，用來排序。 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
