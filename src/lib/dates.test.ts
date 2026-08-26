import { describe, expect, it } from 'vitest'
import {
  addDays,
  countdownLabel,
  daysUntil,
  diffDays,
  formatDateWithWeekday,
  isValidDateString,
  isValidTimeString,
  periodSpanTime,
  sortPeriods,
  timeToMinutes,
  todayISO,
  weekdayOf,
} from './dates'
import type { Period } from '../types'

describe('todayISO 用台北時區', () => {
  it('UTC 深夜在台北已經是隔天', () => {
    // 2026-09-13T17:00Z = 2026-09-14 01:00 台北
    expect(todayISO(new Date('2026-09-13T17:00:00Z'))).toBe('2026-09-14')
  })

  it('UTC 早上在台北仍是同一天', () => {
    expect(todayISO(new Date('2026-09-13T02:00:00Z'))).toBe('2026-09-13')
  })
})

describe('diffDays 算日曆日', () => {
  it('同一天是 0', () => {
    expect(diffDays('2026-09-14', '2026-09-14')).toBe(0)
  })

  it('隔天是 1', () => {
    expect(diffDays('2026-09-14', '2026-09-15')).toBe(1)
  })

  it('過期是負數', () => {
    expect(diffDays('2026-09-14', '2026-09-10')).toBe(-4)
  })

  it('跨月正確', () => {
    expect(diffDays('2026-09-28', '2026-10-02')).toBe(4)
  })

  it('跨年正確', () => {
    expect(diffDays('2026-12-30', '2027-01-02')).toBe(3)
  })

  it('跨閏日正確', () => {
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2)
  })
})

describe('daysUntil 以台北的今天為基準', () => {
  const now = new Date('2026-09-13T16:30:00Z') // 台北 2026-09-14 00:30

  it('當天到期是 0', () => {
    expect(daysUntil('2026-09-14', now)).toBe(0)
  })

  it('隔天到期是 1', () => {
    expect(daysUntil('2026-09-15', now)).toBe(1)
  })

  it('已過期是負數', () => {
    expect(daysUntil('2026-09-12', now)).toBe(-2)
  })
})

describe('countdownLabel', () => {
  it.each([
    [0, '今天'],
    [1, '明天'],
    [2, '2 天後'],
    [30, '30 天後'],
    [-1, '1 天前'],
    [-7, '7 天前'],
  ])('%i 天 -> %s', (days, label) => {
    expect(countdownLabel(days)).toBe(label)
  })
})

describe('addDays', () => {
  it('跨月', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('往回跨年', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })
})

describe('節次排序與時間換算', () => {
  it('午休 20 排在 4 和 5 中間，不是最後', () => {
    expect(sortPeriods([5, 20, 4] as Period[])).toEqual([4, 20, 5])
  })

  it('單節的起訖', () => {
    expect(periodSpanTime([1])).toEqual({ start: '08:10', end: '09:00' })
  })

  it('連續三節是一段：第一節開始到最後一節結束', () => {
    expect(periodSpanTime([1, 2, 3])).toEqual({ start: '08:10', end: '11:00' })
  })

  it('下午兩節', () => {
    expect(periodSpanTime([7, 8])).toEqual({ start: '15:10', end: '17:00' })
  })

  it('午休節次', () => {
    expect(periodSpanTime([20])).toEqual({ start: '12:10', end: '13:00' })
  })

  it('輸入順序顛倒也算得出正確起訖', () => {
    expect(periodSpanTime([4, 2, 3] as Period[])).toEqual({ start: '09:10', end: '12:00' })
  })

  it('跨越午休的一段從 4 節到 5 節', () => {
    expect(periodSpanTime([4, 20, 5] as Period[])).toEqual({ start: '11:10', end: '14:00' })
  })
})

describe('星期判斷', () => {
  it('2026-09-14 是星期一', () => {
    expect(weekdayOf('2026-09-14')).toBe(1)
  })

  it('週末回 null', () => {
    expect(weekdayOf('2026-09-19')).toBeNull()
    expect(weekdayOf('2026-09-20')).toBeNull()
  })

  it('顯示文字', () => {
    expect(formatDateWithWeekday('2026-09-14')).toBe('9 月 14 日 星期一')
  })
})

describe('格式驗證', () => {
  it('擋掉不存在的日期', () => {
    expect(isValidDateString('2026-02-30')).toBe(false)
    expect(isValidDateString('2026-13-01')).toBe(false)
    expect(isValidDateString('2026-9-1')).toBe(false)
    expect(isValidDateString('2026-09-14')).toBe(true)
  })

  it('時間格式', () => {
    expect(isValidTimeString('09:10')).toBe(true)
    expect(isValidTimeString('24:00')).toBe(false)
    expect(isValidTimeString('9:10')).toBe(false)
  })

  it('時間轉分鐘', () => {
    expect(timeToMinutes('08:10')).toBe(490)
  })
})
