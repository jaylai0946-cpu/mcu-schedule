import { describe, expect, it } from 'vitest'
import { SEED_COURSES } from '../seed'
import {
  buildWeekLayout,
  classesOnWeekday,
  enrolled,
  periodRows,
  splitContiguous,
  totalCredits,
  waitlisted,
} from './schedule'
import type { Period } from '../types'

describe('splitContiguous', () => {
  it('連續節次是一段', () => {
    expect(splitContiguous([1, 2, 3])).toEqual([[1, 2, 3]])
  })

  it('4 和 5 中間隔著午休，所以不連續', () => {
    expect(splitContiguous([4, 5] as Period[])).toEqual([[4], [5]])
  })

  it('4-午-5 是連續的一段', () => {
    expect(splitContiguous([4, 20, 5] as Period[])).toEqual([[4, 20, 5]])
  })

  it('跳過的節次會分成兩段', () => {
    expect(splitContiguous([1, 2, 7, 8] as Period[])).toEqual([
      [1, 2],
      [7, 8],
    ])
  })
})

describe('buildWeekLayout', () => {
  const layout = buildWeekLayout(SEED_COURSES)

  it('跨三節的課是一個色塊，不是三個', () => {
    const acc = layout.blocks.filter((b) => b.course.id === 'acc' && b.d === 1)
    expect(acc).toHaveLength(1)
    expect(acc[0].rowSpan).toBe(3)
    expect(acc[0].rowStart).toBe(0)
    expect(acc[0].start).toBe('08:10')
    expect(acc[0].end).toBe('11:00')
  })

  it('每天都有課了，沒有整天空的星期', () => {
    expect(layout.emptyDays).toEqual([])
  })

  it('午休的班會落在第 5 列（索引 4）', () => {
    const hr = layout.blocks.find((b) => b.course.id === 'hr')!
    expect(hr.rowStart).toBe(4)
    expect(hr.rowSpan).toBe(1)
  })

  it('下午的課列索引接在午休之後', () => {
    const chi = layout.blocks.find((b) => b.course.id === 'chi')!
    expect(chi.rowStart).toBe(5) // 第 5 節在 PERIOD_ORDER 的索引 5
    expect(chi.start).toBe('13:10')
  })

  it('佔用格子的數量等於所有節次數', () => {
    const totalPeriods = SEED_COURSES.flatMap((c) => c.sessions).reduce((n, s) => n + s.ps.length, 0)
    expect(layout.occupied.size).toBe(totalPeriods)
  })
})

describe('classesOnWeekday', () => {
  it('星期四的三堂課照時間排序', () => {
    const thu = classesOnWeekday(SEED_COURSES, 4)
    expect(thu.map((c) => c.course.id)).toEqual(['biz', 'eng', 'acc'])
    expect(thu.map((c) => c.start)).toEqual(['09:10', '13:10', '15:10'])
  })

  it('實習時段用自己的教師覆蓋課程教師', () => {
    const acc = classesOnWeekday(SEED_COURSES, 4).find((c) => c.course.id === 'acc')!
    expect(acc.teacher).toBe('陳映蓉')
    expect(acc.session.room).toBe('B102')
  })

  it('星期二是職場素養（午休）和永續', () => {
    const tue = classesOnWeekday(SEED_COURSES, 2)
    // 職場素養是午休（12:10）那節，排在下午的永續之前
    expect(tue.map((c) => c.course.id)).toEqual(['career', 'sdg'])
  })

  it('有課用到夜間節次時，課表才長出那幾列', () => {
    // 全民國防（四）在 50、60 節；沒人上的 40、70 不長出來
    expect(periodRows(SEED_COURSES)).toEqual([1, 2, 3, 4, 20, 5, 6, 7, 8, 50, 60])

    const daytimeOnly = SEED_COURSES.filter((c) => c.code !== '00934')
    expect(periodRows(daytimeOnly)).toEqual([1, 2, 3, 4, 20, 5, 6, 7, 8])
  })
})

describe('學分', () => {
  it('選上的 13 門共 23 學分，沒有候補的了', () => {
    expect(enrolled(SEED_COURSES)).toHaveLength(13)
    expect(totalCredits(enrolled(SEED_COURSES))).toBe(23)
    expect(waitlisted(SEED_COURSES)).toEqual([])
  })
})
