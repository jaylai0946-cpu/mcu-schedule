import { describe, expect, it } from 'vitest'
import { ACADEMIC_CALENDAR } from './academicCalendar'
import { SEMESTER_DEFAULT } from '../constants'
import { weekdayIndex } from '../lib/dates'

const allRows = ACADEMIC_CALENDAR.flatMap((s) => s.rows)
const allDays = allRows.flatMap((r) => r.days).filter((d) => d !== null)

describe('行事曆資料本身', () => {
  it('兩個學期都有資料', () => {
    expect(ACADEMIC_CALENDAR).toHaveLength(2)
    expect(ACADEMIC_CALENDAR[0].title).toBe('115 學年度第 1 學期')
    expect(ACADEMIC_CALENDAR[0].rows.length).toBeGreaterThan(25)
    expect(ACADEMIC_CALENDAR[1].rows.length).toBeGreaterThan(25)
  })

  it('每一格的日期都落在正確的星期欄（第 0 欄是星期日）', () => {
    for (const row of allRows) {
      row.days.forEach((day, col) => {
        if (day) expect([day.iso, weekdayIndex(day.iso)]).toEqual([day.iso, col])
      })
    }
  })

  it('日期連續，沒有跳號或重複', () => {
    const isos = allDays.map((d) => d!.iso)
    const first = ACADEMIC_CALENDAR[0].rows[0].days.find(Boolean)!.iso
    expect(first).toBe('2026-08-01')
    expect(new Set(isos).size).toBe(isos.length)
  })

  it('每一格的日數和 ISO 字串對得起來', () => {
    for (const day of allDays) {
      expect(Number(day!.iso.slice(8))).toBe(day!.d)
    }
  })

  it('第 1 學期涵蓋開學日與期末評量週', () => {
    const isos = ACADEMIC_CALENDAR[0].rows.flatMap((r) => r.days).filter(Boolean).map((d) => d!.iso)
    expect(isos).toContain(SEMESTER_DEFAULT.start)
    expect(isos).toContain(SEMESTER_DEFAULT.end)
  })

  it('開學日那一列的事項寫著開學正式上課', () => {
    const row = ACADEMIC_CALENDAR[0].rows.find((r) =>
      r.days.some((d) => d?.iso === SEMESTER_DEFAULT.start),
    )!
    expect(row.events).toContain('開學')
    expect(row.events).toContain('正式上課')
  })

  it('期末學習評量週在 1/4 到 1/8', () => {
    const pick = ACADEMIC_CALENDAR[0].rows
      .flatMap((r) => r.picks)
      .find((p) => p.title.includes('期末學習評量週'))!
    expect(pick.start).toBe('2027-01-04')
    expect(pick.end).toBe('2027-01-08')
  })

  it('期中學習評量週在 11/2 到 11/6', () => {
    const pick = ACADEMIC_CALENDAR[0].rows
      .flatMap((r) => r.picks)
      .find((p) => p.title.includes('期中學習評量週'))!
    expect(pick.start).toBe('2026-11-02')
    expect(pick.end).toBe('2026-11-06')
  })

  it('可一鍵加入的事項，日期都在自己那一列裡面', () => {
    for (const row of allRows) {
      const isos = new Set(row.days.filter(Boolean).map((d) => d!.iso))
      for (const pick of row.picks) {
        expect(isos.has(pick.start)).toBe(true)
        if (pick.end) expect(isos.has(pick.end)).toBe(true)
        expect(pick.title.length).toBeGreaterThan(0)
      }
    }
  })
})
