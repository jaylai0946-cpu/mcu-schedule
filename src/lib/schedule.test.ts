import { describe, expect, it } from 'vitest'
import { SEED_COURSES } from '../seed'
import { buildWeekLayout, classesOnWeekday, splitContiguous, totalCredits } from './schedule'
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

  it('星期二整天沒課', () => {
    expect(layout.emptyDays).toEqual([2])
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

  it('星期二沒有任何課', () => {
    expect(classesOnWeekday(SEED_COURSES, 2)).toEqual([])
  })
})

describe('學分', () => {
  it('學分合計 15', () => {
    expect(totalCredits(SEED_COURSES)).toBe(15)
  })
})
