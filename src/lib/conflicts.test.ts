import { describe, expect, it } from 'vitest'
import { SEED_COURSES } from '../seed'
import { describeConflict, detectConflicts } from './conflicts'
import type { Course } from '../types'

function draft(partial: Partial<Course>): Course {
  return {
    id: 'new',
    name: '新課程',
    code: 'X0000',
    teacher: '某老師',
    credits: 2,
    hue: 214,
    sat: 42,
    sessions: [],
    ...partial,
  }
}

describe('detectConflicts', () => {
  it('星期一 1-3 節會撞到會計學（一）', () => {
    const conflicts = detectConflicts(
      draft({ sessions: [{ d: 1, ps: [1, 2, 3], room: 'X101' }] }),
      SEED_COURSES,
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].withName).toBe('會計學（一）')
    expect(conflicts[0].ps).toEqual([1, 2, 3])
    expect(describeConflict(conflicts[0])).toBe(
      '星期一 第 1 節、第 2 節、第 3 節：和「會計學（一）」衝堂',
    )
  })

  it('只撞到一節也要報出來，而且只報撞到的那一節', () => {
    const conflicts = detectConflicts(
      draft({ sessions: [{ d: 1, ps: [3, 4], room: 'X101' }] }),
      SEED_COURSES,
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].ps).toEqual([3])
  })

  it('星期二整天沒課，怎麼排都不會衝', () => {
    expect(
      detectConflicts(draft({ sessions: [{ d: 2, ps: [1, 2, 3, 4], room: 'X101' }] }), SEED_COURSES),
    ).toEqual([])
  })

  it('午休節次撞到班會', () => {
    const conflicts = detectConflicts(
      draft({ sessions: [{ d: 3, ps: [20], room: 'X101' }] }),
      SEED_COURSES,
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].withName).toBe('班會')
    expect(describeConflict(conflicts[0])).toBe('星期三 午休：和「班會」衝堂')
  })

  it('撞到的是實習時段時，訊息要標出來', () => {
    const conflicts = detectConflicts(
      draft({ sessions: [{ d: 4, ps: [7], room: 'X101' }] }),
      SEED_COURSES,
    )
    expect(describeConflict(conflicts[0])).toBe('星期四 第 7 節：和「會計學（一）（實習）」衝堂')
  })

  it('編輯現有課程時不會跟自己的舊版本衝突', () => {
    const acc = SEED_COURSES.find((c) => c.id === 'acc')!
    const edited: Course = { ...acc, sessions: [{ d: 1, ps: [1, 2, 3], room: 'H403' }] }
    expect(detectConflicts(edited, SEED_COURSES)).toEqual([])
  })

  it('一門課自己的兩個時段排在同一節也會被擋', () => {
    const conflicts = detectConflicts(
      draft({
        sessions: [
          { d: 2, ps: [1, 2], room: 'A' },
          { d: 2, ps: [2, 3], room: 'B' },
        ],
      }),
      SEED_COURSES,
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].selfOverlap).toBe(true)
    expect(describeConflict(conflicts[0])).toContain('自己有兩個時段排在同一節')
  })

  it('一次撞到多門課會全部列出', () => {
    const conflicts = detectConflicts(
      draft({
        sessions: [
          { d: 1, ps: [1], room: 'A' },
          { d: 3, ps: [3], room: 'B' },
        ],
      }),
      SEED_COURSES,
    )
    expect(conflicts.map((c) => c.withName).sort()).toEqual(['人工智慧概論', '會計學（一）'])
  })

  it('種子資料本身沒有任何衝堂', () => {
    for (const course of SEED_COURSES) {
      expect(detectConflicts(course, SEED_COURSES)).toEqual([])
    }
  })
})
