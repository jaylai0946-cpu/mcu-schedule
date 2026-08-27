import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedState } from '../seed'
import {
  describeState,
  forcePush,
  generateKey,
  loadSyncConfig,
  pull,
  push,
  saveSyncConfig,
  validateEndpoint,
  validateKey,
  type SyncConfig,
} from './sync'
import { exportJSON } from './storage'

const CONFIG: SyncConfig = {
  endpoint: 'https://sync.example.workers.dev',
  key: 'abcdefghij0123456789abcdefghij01',
  lastSeen: null,
  dirty: false,
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (url: string, init?: RequestInit) => handler(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('密鑰', () => {
  it('產生的是 32 個小寫英數字', () => {
    for (let i = 0; i < 20; i++) expect(validateKey(generateKey())).toBeNull()
  })

  it('每次都不一樣', () => {
    expect(new Set(Array.from({ length: 50 }, generateKey)).size).toBe(50)
  })

  it('格式不對的會被擋', () => {
    expect(validateKey('太短')).toBe('密鑰必須是 32 個小寫英數字')
    expect(validateKey('ABCDEFGHIJ0123456789ABCDEFGHIJ01')).not.toBeNull()
  })
})

describe('端點檢查', () => {
  it('必須是 https', () => {
    expect(validateEndpoint('http://sync.example.com')).toContain('https')
    expect(validateEndpoint('https://sync.example.com')).toBeNull()
  })

  it('localhost 放行，方便開發', () => {
    expect(validateEndpoint('http://localhost:8787')).toBeNull()
  })

  it('亂填的網址會被擋', () => {
    expect(validateEndpoint('隨便打')).toContain('網址格式不對')
  })
})

describe('設定不會混進 JSON 備份', () => {
  it('同步設定存在自己的 key，匯出備份不會帶到密鑰', () => {
    saveSyncConfig(CONFIG)
    expect(loadSyncConfig()?.key).toBe(CONFIG.key)
    expect(exportJSON(createSeedState())).not.toContain(CONFIG.key)
  })

  it('壞掉的設定會被當成沒設定，不會炸掉', () => {
    localStorage.setItem('mcu-schedule.sync', '{壞掉的')
    expect(loadSyncConfig()).toBeNull()
  })
})

describe('pull', () => {
  it('雲端還沒有資料時回 empty', async () => {
    stubFetch(() => new Response('', { status: 404 }))
    expect(await pull(CONFIG)).toEqual({ status: 'empty' })
  })

  it('讀得回來就回 ok，網址帶密鑰', async () => {
    const state = createSeedState()
    const spy = stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T00:00:00.000Z', state }))

    const result = await pull(CONFIG)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.record.state.courses).toHaveLength(8)
    expect(spy.mock.calls[0][0]).toBe(`${CONFIG.endpoint}/s/${CONFIG.key}`)
  })

  it('雲端的資料一樣要過驗證，壞的不會套用', async () => {
    stubFetch(() =>
      jsonResponse({ updatedAt: '2026-08-27T00:00:00.000Z', state: { courses: 'ㄟ' } }),
    )
    const result = await pull(CONFIG)
    expect(result.status).toBe('error')
    if (result.status === 'error') expect(result.message).toContain('雲端資料有問題')
  })

  it('舊 schema 的雲端資料會被升級', async () => {
    const old = createSeedState() as unknown as Record<string, unknown>
    delete old.schoolEvents
    old.version = 1
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T00:00:00.000Z', state: old }))

    const result = await pull(CONFIG)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.record.state.schoolEvents).toEqual([])
  })

  it('連不上時回報錯誤，不會丟例外', async () => {
    stubFetch(() => {
      throw new Error('Failed to fetch')
    })
    expect(await pull(CONFIG)).toEqual({ status: 'error', message: 'Failed to fetch' })
  })
})

describe('push', () => {
  it('第一次推不帶 If-Match', async () => {
    const spy = stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T01:00:00.000Z' }))
    const result = await push(CONFIG, createSeedState())

    expect(result).toEqual({ status: 'ok', updatedAt: '2026-08-27T01:00:00.000Z' })
    expect((spy.mock.calls[0][1]!.headers as Record<string, string>)['If-Match']).toBeUndefined()
  })

  it('之後會帶上「上次看到的版本」', async () => {
    const spy = stubFetch(() => jsonResponse({ updatedAt: 'x' }))
    await push({ ...CONFIG, lastSeen: '2026-08-27T01:00:00.000Z' }, createSeedState())
    expect((spy.mock.calls[0][1]!.headers as Record<string, string>)['If-Match']).toBe(
      '"2026-08-27T01:00:00.000Z"',
    )
  })

  it('雲端被別台改過時回 conflict，而且不會蓋掉', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'hw',
      title: '另一台加的',
      date: '2026-10-01',
      done: false,
      createdAt: '2026-08-27T00:00:00.000Z',
    })
    stubFetch(() =>
      jsonResponse({ error: 'conflict', remote: { updatedAt: '2026-08-27T02:00:00.000Z', state: remote } }, 409),
    )

    const result = await push({ ...CONFIG, lastSeen: '舊的' }, createSeedState())
    expect(result.status).toBe('conflict')
    if (result.status === 'conflict') {
      expect(result.remote.state.items[0].title).toBe('另一台加的')
      expect(result.remote.updatedAt).toBe('2026-08-27T02:00:00.000Z')
    }
  })

  it('伺服器回錯誤時如實回報', async () => {
    stubFetch(() => new Response('', { status: 500 }))
    expect(await push(CONFIG, createSeedState())).toEqual({
      status: 'error',
      message: '伺服器回 500',
    })
  })

  it('送出去的內容包含完整的 state', async () => {
    const spy = stubFetch(() => jsonResponse({ updatedAt: 'x' }))
    const state = createSeedState()
    await push(CONFIG, state)
    const body = JSON.parse(spy.mock.calls[0][1]!.body as string)
    expect(body.state.courses).toHaveLength(8)
    expect(body.version).toBe(state.version)
  })
})

describe('forcePush', () => {
  it('先讀一次拿到最新版本再蓋，不會卡在 conflict', async () => {
    const calls: string[] = []
    const spy = stubFetch((_url, init) => {
      const method = init?.method ?? 'GET'
      calls.push(method)
      if (method === 'GET') {
        return jsonResponse({ updatedAt: '2026-08-27T03:00:00.000Z', state: createSeedState() })
      }
      return jsonResponse({ updatedAt: '2026-08-27T04:00:00.000Z' })
    })

    const result = await forcePush({ ...CONFIG, lastSeen: '過期的' }, createSeedState())
    expect(result).toEqual({ status: 'ok', updatedAt: '2026-08-27T04:00:00.000Z' })
    expect(calls).toEqual(['GET', 'PUT'])
    expect((spy.mock.calls[1][1]!.headers as Record<string, string>)['If-Match']).toBe(
      '"2026-08-27T03:00:00.000Z"',
    )
  })
})

describe('describeState', () => {
  it('講清楚兩邊差在哪', () => {
    const state = createSeedState()
    state.items.push(
      { id: 'a', kind: 'hw', title: 'A', date: '2026-10-01', done: false, createdAt: '' },
      { id: 'b', kind: 'hw', title: 'B', date: '2026-10-02', done: true, createdAt: '' },
    )
    expect(describeState(state)).toBe('8 門課、2 筆待辦（1 筆未完成）、0 筆重要日期')
  })
})
