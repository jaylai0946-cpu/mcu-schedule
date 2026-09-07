import type { CalendarRow, CalendarSemester } from '../data/academicCalendar'
import { addDays, diffDays } from './dates'

/** 行事曆上要標出來的兩種日子。 */
export type AlmanacMark = 'holiday' | 'exam'

/** 期中、期末、畢業學期的學習評量週。招生考試、聽力測驗那些不算。 */
const EXAM_WEEK = /評量週/

/**
 * 放假：國定假日、補假、共同休假、寒暑假。
 * 寒假／暑假要求寫在開頭，才不會把「預定寒假轉學生註冊報到」也算成放假。
 */
const HOLIDAY = /放假|休假|補假|連假|除夕|春節|元旦|國慶|紀念日|節$|^(寒假|暑假)/

/** 週次欄寫著這些字的整列都是假期。 */
const VACATION_WEEKS = new Set(['寒假', '暑假'])

/** 一筆行事曆事項該標成什麼，兩種都不是就回 null。 */
export function markForTitle(title: string): AlmanacMark | null {
  if (EXAM_WEEK.test(title)) return 'exam'
  if (HOLIDAY.test(title)) return 'holiday'
  return null
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

/**
 * 把「2-6」「24、28」「1」換成這一列裡對應的日期。
 * 「10/8-10/27」那種跨月的寫法一律跳過——它們是報名期間，不是放假，
 * 而且日數不在這一列裡，硬解會標錯。
 */
function isosFromSpec(spec: string, rows: (CalendarRow | undefined)[]): string[] {
  if (spec.includes('/')) return []
  const isos: string[] = []
  for (const part of spec.split(/[、,，]/)) {
    const range = part.match(/^\s*(\d{1,2})\s*[-–~～]\s*(\d{1,2})\s*$/)
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) {
        const iso = isoOfDay(rows, n)
        if (iso) isos.push(iso)
      }
      continue
    }
    const single = part.match(/^\s*(\d{1,2})\s*$/)
    if (single) {
      const iso = isoOfDay(rows, Number(single[1]))
      if (iso) isos.push(iso)
    }
  }
  return isos
}

/**
 * 直接讀事項欄。picks 只收得出確切日期的事項，像「(1)元旦」「(2、7)校慶補假」
 * 都不在裡面，但那些正是要標成放假的日子。
 */
export function eventsInRow(
  row: CalendarRow,
  next?: CalendarRow,
  prev?: CalendarRow,
): { title: string; isos: string[] }[] {
  const found: { title: string; isos: string[] }[] = []
  for (const [, spec, rawTitle] of row.events.matchAll(SEGMENT)) {
    const title = rawTitle.trim()
    if (title) found.push({ title, isos: isosFromSpec(spec, [row, next, prev]) })
  }
  return found
}

export interface DayMark {
  mark: AlmanacMark
  /** 這一天為什麼被標起來，滑過去會看到 */
  titles: string[]
}

/** 一段區間的每一天。跨度異常大的資料只取前 400 天，避免壞資料把畫面卡死。 */
function datesBetween(start: string, end: string): string[] {
  const span = diffDays(start, end)
  if (span < 0) return [start]
  const days: string[] = []
  for (let i = 0; i <= Math.min(span, 400); i++) days.push(addDays(start, i))
  return days
}

/**
 * 掃過一個學期的所有列，算出每一天要標什麼。
 * 來源有兩個：週次欄寫著寒假／暑假的整列，以及各列挑得出確切日期的事項。
 */
export function buildDayMarks(semester: CalendarSemester): Map<string, DayMark> {
  const marks = new Map<string, DayMark>()

  const add = (iso: string, mark: AlmanacMark, title: string) => {
    const existing = marks.get(iso)
    if (!existing) {
      marks.set(iso, { mark, titles: [title] })
      return
    }
    if (!existing.titles.includes(title)) existing.titles.push(title)
    // 同一天又放假又是評量週的話以放假為準，不要讓資料順序決定結果
    if (mark === 'holiday') existing.mark = 'holiday'
  }

  for (const [index, row] of semester.rows.entries()) {
    if (VACATION_WEEKS.has(row.week)) {
      for (const day of row.days) {
        if (day) add(day.iso, 'holiday', row.week)
      }
    }

    for (const event of eventsInRow(row, semester.rows[index + 1], semester.rows[index - 1])) {
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
