import { beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, STORAGE_KEY } from '../constants'
import { createSeedState, SEED_COURSES } from '../seed'
import { CORRUPT_KEY, exportJSON, importJSON, loadState, saveState } from './storage'
import { validateAppState } from './validate'

beforeEach(() => {
  localStorage.clear()
})

describe('種子資料', () => {
  it('8 門課，共 15 學分', () => {
    expect(SEED_COURSES).toHaveLength(8)
    expect(SEED_COURSES.reduce((sum, c) => sum + c.credits, 0)).toBe(15)
  })

  it('會計學有正課和實習兩個時段，教室與教師不同', () => {
    const acc = SEED_COURSES.find((c) => c.id === 'acc')!
    expect(acc.sessions).toHaveLength(2)
    expect(acc.sessions[0]).toMatchObject({ d: 1, ps: [1, 2, 3], room: 'H402' })
    expect(acc.sessions[1]).toMatchObject({ d: 4, room: 'B102', label: '實習', teacher: '陳映蓉' })
  })

  it('星期二整天沒課', () => {
    const tuesday = SEED_COURSES.flatMap((c) => c.sessions).filter((s) => s.d === 2)
    expect(tuesday).toEqual([])
  })

  it('班會在星期三的午休節次', () => {
    const hr = SEED_COURSES.find((c) => c.id === 'hr')!
    expect(hr.sessions[0]).toMatchObject({ d: 3, ps: [20], room: 'B102' })
  })

  it('種子資料本身通過驗證', () => {
    expect(validateAppState(createSeedState()).ok).toBe(true)
  })
})

describe('loadState', () => {
  it('localStorage 空的時候用種子資料重建而不是崩潰', () => {
    const result = loadState()
    expect(result.source).toBe('seed')
    expect(result.state.courses).toHaveLength(8)
    // 並且順手寫回去，下次開啟就是 stored
    expect(loadState().source).toBe('stored')
  })

  it('重新整理後資料還在', () => {
    const state = createSeedState()
    state.items.push({
      id: 'a1',
      kind: 'hw',
      title: '經濟學習題',
      date: '2026-09-20',
      done: false,
      createdAt: new Date('2026-09-14T00:00:00Z').toISOString(),
    })
    expect(saveState(state)).toEqual({ ok: true })

    const reloaded = loadState()
    expect(reloaded.source).toBe('stored')
    expect(reloaded.state.items).toHaveLength(1)
    expect(reloaded.state.items[0].title).toBe('經濟學習題')
  })

  it('壞掉的 JSON 會另存備查並用種子資料撐住', () => {
    localStorage.setItem(STORAGE_KEY, '{這不是 JSON')
    const result = loadState()
    expect(result.source).toBe('recovered')
    expect(result.state.courses).toHaveLength(8)
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{這不是 JSON')
  })

  it('結構壞掉（課程少了 sessions）也會被攔下來', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createSeedState(), courses: [{ id: 'x', name: '壞課' }] }),
    )
    const result = loadState()
    expect(result.source).toBe('recovered')
    expect(result.error).toContain('sessions')
  })

  it('沒有 version 的舊資料會升級到現在的 schema 版本', () => {
    const old = createSeedState() as unknown as Record<string, unknown>
    delete old.version
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old))

    const result = loadState()
    expect(result.source).toBe('stored')
    expect(result.state.version).toBe(SCHEMA_VERSION)
    expect(result.state.courses).toHaveLength(8)
  })
})

describe('saveState 驗證後才寫入', () => {
  it('資料壞掉時不覆蓋舊的', () => {
    const good = createSeedState()
    saveState(good)
    const before = localStorage.getItem(STORAGE_KEY)

    const broken = { ...createSeedState(), semester: { start: '不是日期', end: '2027-01-17' } }
    const result = saveState(broken)

    expect(result.ok).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('待辦日期不合法時整筆擋下', () => {
    const state = createSeedState()
    state.items.push({
      id: 'bad',
      kind: 'exam',
      title: '期中考',
      date: '2026-02-30',
      done: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(saveState(state).ok).toBe(false)
  })
})

describe('JSON 備份匯出匯入', () => {
  it('匯出再匯入是同一份資料', () => {
    const state = createSeedState()
    const restored = importJSON(exportJSON(state))
    expect(restored.ok).toBe(true)
    if (restored.ok) expect(restored.state).toEqual(state)
  })

  it('亂七八糟的檔案會被拒絕，並說明原因', () => {
    expect(importJSON('這不是備份')).toEqual({ ok: false, error: '不是合法的 JSON 檔' })
    const bad = importJSON(JSON.stringify({ profile: {}, semester: {}, courses: [], items: [] }))
    expect(bad.ok).toBe(false)
  })
})

describe('schema v1 -> v2 升級', () => {
  it('沒有 schoolEvents 的舊資料會補成空陣列，其他資料不動', () => {
    const old = createSeedState() as unknown as Record<string, unknown>
    delete old.schoolEvents
    old.version = 1
    old.items = [
      {
        id: 'keep',
        kind: 'hw',
        title: '舊的作業',
        date: '2026-12-01',
        done: false,
        createdAt: '2026-08-27T00:00:00.000Z',
      },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old))

    const result = loadState()
    expect(result.source).toBe('stored')
    expect(result.state.version).toBe(SCHEMA_VERSION)
    expect(result.state.schoolEvents).toEqual([])
    expect(result.state.items[0].title).toBe('舊的作業')
    expect(result.state.courses).toHaveLength(8)
  })

  it('匯入 v1 時代的舊備份也吃得下', () => {
    const old = createSeedState() as unknown as Record<string, unknown>
    delete old.schoolEvents
    old.version = 1
    const result = importJSON(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.schoolEvents).toEqual([])
  })

  it('結束日早於開始日的行事曆會被擋下', () => {
    const state = createSeedState()
    state.schoolEvents.push({
      id: 'bad',
      kind: 'exam',
      title: '亂填的',
      start: '2026-11-13',
      end: '2026-11-09',
    })
    const result = saveState(state)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('結束日期早於開始日期')
  })

  it('結束日等於開始日會被正規化成單日', () => {
    const state = createSeedState()
    state.schoolEvents.push({
      id: 'same',
      kind: 'term',
      title: '開學日',
      start: '2026-09-14',
      end: '2026-09-14',
    })
    saveState(state)
    expect(loadState().state.schoolEvents[0].end).toBeUndefined()
  })
})

describe('schema v3 -> v4 換教室', () => {
  /** 拿種子資料倒推回 v3（舊教室）的樣子 */
  function v3StateWithRoom(courseId: string, room: string) {
    const raw = createSeedState() as unknown as Record<string, unknown>
    raw.version = 3
    const courses = raw.courses as { id: string; sessions: { room: string }[] }[]
    const course = courses.find((c) => c.id === courseId)!
    course.sessions[course.sessions.length - 1].room = room
    return raw
  }

  function roomOf(state: { courses: { id: string; sessions: { room: string }[] }[] }, id: string) {
    const sessions = state.courses.find((c) => c.id === id)!.sessions
    return sessions[sessions.length - 1].room
  }

  it('還停在舊教室的四堂課會被換成新教室', () => {
    const raw = createSeedState() as unknown as Record<string, unknown>
    raw.version = 3
    const courses = raw.courses as { id: string; sessions: { room: string }[] }[]
    courses.find((c) => c.id === 'chi')!.sessions[0].room = 'D206'
    courses.find((c) => c.id === 'ai')!.sessions[0].room = 'F610'
    courses.find((c) => c.id === 'hr')!.sessions[0].room = 'D106'
    courses.find((c) => c.id === 'acc')!.sessions[1].room = 'D105'
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw))

    const { state, source } = loadState()
    expect(source).toBe('stored')
    expect(state.version).toBe(SCHEMA_VERSION)
    expect(roomOf(state, 'chi')).toBe('B302')
    expect(roomOf(state, 'ai')).toBe('D305')
    expect(roomOf(state, 'hr')).toBe('B102')
    expect(roomOf(state, 'acc')).toBe('B102')
  })

  it('自己改過教室的不會被蓋掉', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3StateWithRoom('ai', 'H999')))
    expect(roomOf(loadState().state, 'ai')).toBe('H999')
  })

  it('換過一次之後不會再動第二次', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3StateWithRoom('chi', 'D206')))
    const once = loadState().state
    expect(roomOf(once, 'chi')).toBe('B302')

    // 已經是 v4 了，之後每次載入都不會再跑這段
    saveState(once)
    expect(roomOf(loadState().state, 'chi')).toBe('B302')
  })

  it('正課的教室不會被實習那筆的規則波及', () => {
    // 會計正課在星期一 H402，規則只挑星期四的 D105
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v3StateWithRoom('acc', 'D105')))
    const acc = loadState().state.courses.find((c) => c.id === 'acc')!
    expect(acc.sessions[0].room).toBe('H402')
    expect(acc.sessions[1].room).toBe('B102')
  })
})

describe('schema v2 -> v3 換上官方學期日期', () => {
  function v2StateWith(semester: { start: string; end: string }) {
    const raw = createSeedState() as unknown as Record<string, unknown>
    raw.version = 2
    raw.semester = semester
    return raw
  }

  it('還停在暫定值的會被換成官方日期', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(v2StateWith({ start: '2026-09-14', end: '2027-01-17' })),
    )
    const result = loadState()
    expect(result.source).toBe('stored')
    expect(result.state.semester).toEqual({ start: '2026-09-07', end: '2027-01-08' })
    expect(result.state.version).toBe(SCHEMA_VERSION)
  })

  it('自己改過的日期不會被蓋掉', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(v2StateWith({ start: '2026-09-21', end: '2026-12-25' })),
    )
    expect(loadState().state.semester).toEqual({ start: '2026-09-21', end: '2026-12-25' })
  })

  it('只改到半途的也算自己改過，不動它', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(v2StateWith({ start: '2026-09-14', end: '2026-12-25' })),
    )
    expect(loadState().state.semester).toEqual({ start: '2026-09-14', end: '2026-12-25' })
  })
})
