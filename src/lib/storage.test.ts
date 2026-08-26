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
    expect(acc.sessions[1]).toMatchObject({ d: 4, room: 'D105', label: '實習', teacher: '陳映蓉' })
  })

  it('星期二整天沒課', () => {
    const tuesday = SEED_COURSES.flatMap((c) => c.sessions).filter((s) => s.d === 2)
    expect(tuesday).toEqual([])
  })

  it('班會在星期三的午休節次', () => {
    const hr = SEED_COURSES.find((c) => c.id === 'hr')!
    expect(hr.sessions[0]).toMatchObject({ d: 3, ps: [20], room: 'D106' })
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
