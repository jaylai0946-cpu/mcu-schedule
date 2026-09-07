import { describe, expect, it } from 'vitest'
import { SEED_COURSES } from '../seed'
import { formatMinutes, kickerText, nextClassToday } from './nextClass'

// 2026-09-07 是星期一：會計學 08:10-11:00、中國文學 13:10-15:00、
// 全民國防（待遞補）19:25-21:10
const MONDAY = '2026-09-07'

describe('nextClassToday', () => {
  it('上課中回報還有幾分鐘下課', () => {
    const info = nextClassToday(SEED_COURSES, MONDAY, '09:00')
    expect(info.status).toBe('ongoing')
    expect(info.cls?.course.id).toBe('acc')
    expect(info.minutes).toBe(120) // 到 11:00
  })

  it('課與課之間回報下一堂', () => {
    const info = nextClassToday(SEED_COURSES, MONDAY, '11:30')
    expect(info.status).toBe('next')
    expect(info.cls?.course.id).toBe('chi')
    expect(info.minutes).toBe(100) // 到 13:10
  })

  it('待遞補的課不算「下一堂」——還沒真的選上', () => {
    const info = nextClassToday(SEED_COURSES, MONDAY, '16:00')
    expect(info.status).toBe('done')
    expect(info.cls).toBeUndefined()
    // 但今天的堂數只算選上的那兩堂
    expect(info.count).toBe(2)
  })

  it('週末沒有課', () => {
    expect(nextClassToday(SEED_COURSES, '2026-09-12', '10:00').status).toBe('none')
  })

  it('整天沒課的平日也是 none', () => {
    const info = nextClassToday(
      SEED_COURSES.filter((c) => c.id === 'acc'),
      '2026-09-08',
      '10:00',
    )
    expect(info.status).toBe('none')
  })
})

describe('文案', () => {
  it('不到一小時只講分鐘，超過就拆成小時', () => {
    expect(formatMinutes(15)).toBe('還有 15 分')
    expect(formatMinutes(60)).toBe('還有 1 小時')
    expect(formatMinutes(80)).toBe('還有 1 小時 20 分')
  })

  it('狀態各有各的說法', () => {
    expect(kickerText({ status: 'ongoing', count: 1 })).toBe('正在上課')
    expect(kickerText({ status: 'next', count: 1 })).toBe('下一堂')
    expect(kickerText({ status: 'done', count: 1 })).toBe('今天的課上完了')
    expect(kickerText({ status: 'none', count: 0 })).toBe('今天沒有課')
  })
})
