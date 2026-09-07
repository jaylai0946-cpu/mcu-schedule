import type { CalendarRow, CalendarSemester } from '../data/academicCalendar'
import { addDays, diffDays, weekdayOf } from './dates'

/**
 * 行事曆上要標出來的日子。全部都是以「大一學生自己會遇到什麼」為準：
 * 校務會議、招生考試、教職員研習、其他年級和身分（轉學生、延修生、
 * 碩博士）的註冊選課一律不標，標了只是把整張表塗滿。
 */
export type AlmanacMark = 'holiday' | 'exam' | 'term'

/**
 * 期中、期末學習評量週。
 * 畢業學期評量週是給應屆畢業班的，大一遇不到，所以不標。
 */
const EXAM_WEEK = /(期中|期末)學習評量週/

/**
 * 放假：國定假日、補假、共同休假、寒暑假。
 * 寒假／暑假要求寫在開頭，才不會把「預定寒假轉學生註冊報到」也算成放假。
 */
const HOLIDAY = /放假|休假|補假|連假|除夕|春節|元旦|國慶|紀念日|節$|^(寒假|暑假)/

/** 學期的兩個關鍵日：開學（正式上課）和網路加退選。這兩個逾期就沒得補。 */
const TERM = /開學|正式上課|加退選/

/** 週次欄寫著這些字的整列都是假期。 */
const VACATION_WEEKS = new Set(['寒假', '暑假'])

/** 一筆行事曆事項該標成什麼，都不是就回 null。 */
export function markForTitle(title: string): AlmanacMark | null {
  if (EXAM_WEEK.test(title)) return 'exam'
  if (HOLIDAY.test(title)) return 'holiday'
  if (TERM.test(title)) return 'term'
  return null
}

/** 平日才有課，週末標「放假」對學生沒有意義。 */
function isSchoolDay(iso: string): boolean {
  return weekdayOf(iso) !== null
}

/**
 * 事項欄的一段，例如「(2-6)期中學習評量週」。
 * 括號裡是日數，後面接到下一個括號為止都是標題。
 */
const SEGMENT = /\(([^)]+)\)([^(]*)/g

/**
 * 日數對到哪一天。事項欄是跨列合併的儲存格，「(1)元旦」會寫在 12/27 那一列、
 * 「(2、7)校慶補假」的 7 也落在下一列，所以本列找不到就往下一列、再往上一列找。
 */
function isoOfDay(rows: (CalendarRow | undefined)[], dayNumber: number): string | undefined {
  for (const row of rows) {
    const hit = row?.days.find((d) => d?.d === dayNumber)
    if (hit) return hit.iso
  }
  return undefined
}

/** 一段區間的每一天。跨度異常大的資料只取前 400 天，避免壞資料把畫面卡死。 */
function datesBetween(start: string, end: string): string[] {
  const span = diffDays(start, end)
  if (span < 0) return [start]
  const days: string[] = []
  for (let i = 0; i <= Math.min(span, 400); i++) days.push(addDays(start, i))
  return days
}

/** 這一列開始的日期，用來決定「3/2」是往後找哪一個 3 月 2 日。 */
function firstIso(row: CalendarRow): string | undefined {
  return row.days.find((d) => d)?.iso
}

/**
 * 「3/2」這種寫法：在整個學期的日期裡找出當月當日，優先取這一列之後的那一個。
 * 跨年（12 月的列寫 1/6）也因此對得到。
 */
function isoOfMonthDay(ctx: RowContext, month: number, day: number): string | undefined {
  const suffix = `-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const after = ctx.from ? ctx.allDays?.find((iso) => iso.endsWith(suffix) && iso >= ctx.from!) : undefined
  return after ?? ctx.allDays?.find((iso) => iso.endsWith(suffix))
}

/** 一段日數的起點或終點：可能是「6」也可能是「3/2」。 */
function isoOfEndpoint(part: string, ctx: RowContext): string | undefined {
  const monthDay = part.match(/^\s*(\d{1,2})\/(\d{1,2})\s*$/)
  if (monthDay) return isoOfMonthDay(ctx, Number(monthDay[1]), Number(monthDay[2]))

  const day = part.match(/^\s*(\d{1,2})\s*$/)
  return day ? isoOfDay([ctx.row, ctx.next, ctx.prev], Number(day[1])) : undefined
}

/**
 * 把「2-6」「24、28」「1」「22-3/2」換成實際日期。
 * 區間用頭尾兩端算出來，中間每一天都算在內。
 */
function isosFromSpec(spec: string, ctx: RowContext): string[] {
  const isos: string[] = []
  for (const part of spec.split(/[、,，]/)) {
    const range = part.match(/^(.+?)[-–~～](.+)$/)
    if (range) {
      const start = isoOfEndpoint(range[1], ctx)
      const end = isoOfEndpoint(range[2], ctx)
      if (start && end) isos.push(...datesBetween(start, end))
      continue
    }
    const single = isoOfEndpoint(part, ctx)
    if (single) isos.push(single)
  }
  return isos
}

/**
 * 直接讀事項欄。picks 只收得出確切日期的事項，像「(1)元旦」「(2、7)校慶補假」
 * 都不在裡面，但那些正是要標成放假的日子。
 */
export interface RowContext {
  row: CalendarRow
  next?: CalendarRow
  prev?: CalendarRow
  /** 整個學期的日期，用來解「3/2」這種落在別的月份的寫法 */
  allDays?: string[]
  /** 這一列的第一天，決定跨月的日子要往後找哪一個 */
  from?: string
}

export function eventsInRow(ctx: RowContext): { title: string; isos: string[] }[] {
  const found: { title: string; isos: string[] }[] = []
  for (const [, spec, rawTitle] of ctx.row.events.matchAll(SEGMENT)) {
    const title = rawTitle.trim()
    if (title) found.push({ title, isos: isosFromSpec(spec, ctx) })
  }
  return found
}

/** 數字大的贏。 */
const PRIORITY: Record<AlmanacMark, number> = { term: 0, exam: 1, holiday: 2 }

export interface DayMark {
  mark: AlmanacMark
  /** 這一天為什麼被標起來，滑過去會看到 */
  titles: string[]
}

/**
 * 掃過一個學期的所有列，算出每一天要標什麼。
 * 來源有兩個：週次欄寫著寒假／暑假的整列，以及各列挑得出確切日期的事項。
 */
export function buildDayMarks(semester: CalendarSemester): Map<string, DayMark> {
  const marks = new Map<string, DayMark>()
  const allDays = semester.rows.flatMap((row) => row.days.flatMap((d) => (d ? [d.iso] : [])))

  const add = (iso: string, mark: AlmanacMark, title: string) => {
    // 週末本來就沒課，只有原本要上課的日子放假才值得標
    if (mark === 'holiday' && !isSchoolDay(iso)) return

    const existing = marks.get(iso)
    if (!existing) {
      marks.set(iso, { mark, titles: [title] })
      return
    }
    if (!existing.titles.includes(title)) existing.titles.push(title)
    // 同一天對到好幾種時的優先序：放假 > 考試週 > 開學／加退選。
    // 寫死才不會讓資料順序決定結果。
    if (PRIORITY[mark] > PRIORITY[existing.mark]) existing.mark = mark
  }

  for (const [index, row] of semester.rows.entries()) {
    if (VACATION_WEEKS.has(row.week)) {
      for (const day of row.days) {
        if (day) add(day.iso, 'holiday', row.week)
      }
    }

    const ctx: RowContext = {
      row,
      next: semester.rows[index + 1],
      prev: semester.rows[index - 1],
      allDays,
      from: firstIso(row),
    }

    for (const event of eventsInRow(ctx)) {
      const mark = markForTitle(event.title)
      if (!mark) continue
      for (const iso of event.isos) add(iso, mark, event.title)
    }

    // picks 的區間已經算好，跨列的那種只有它處理得對，所以兩邊都收
    for (const pick of row.picks) {
      const mark = markForTitle(pick.title)
      if (!mark) continue
      for (const iso of datesBetween(pick.start, pick.end ?? pick.start)) {
        add(iso, mark, pick.title)
      }
    }
  }

  return marks
}
