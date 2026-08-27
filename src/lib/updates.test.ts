import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILD_ID, BUILD_TIME, checkForUpdate, watchForUpdates } from './updates'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubServiceWorker(sw: unknown) {
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: sw })
}

describe('版本資訊', () => {
  it('build id 和時間都有值', () => {
    expect(BUILD_ID).toBeTruthy()
    expect(BUILD_TIME).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('checkForUpdate', () => {
  it('沒有 service worker 支援時回報 unsupported', async () => {
    vi.stubGlobal('navigator', {})
    expect(await checkForUpdate()).toEqual({ state: 'unsupported' })
  })

  it('還沒註冊時回報 not-installed', async () => {
    stubServiceWorker({ getRegistration: async () => undefined })
    expect(await checkForUpdate()).toEqual({ state: 'not-installed' })
  })

  it('有新版在安裝時回報 updating', async () => {
    const update = vi.fn(async () => {})
    stubServiceWorker({
      getRegistration: async () => ({ update, installing: {}, waiting: null }),
    })
    expect(await checkForUpdate()).toEqual({ state: 'updating' })
    expect(update).toHaveBeenCalledOnce()
  })

  it('已經是最新版時回報 current', async () => {
    stubServiceWorker({
      getRegistration: async () => ({ update: async () => {}, installing: null, waiting: null }),
    })
    expect(await checkForUpdate()).toEqual({ state: 'current' })
  })

  it('update() 丟錯不會炸掉，會回報原因', async () => {
    stubServiceWorker({
      getRegistration: async () => ({
        update: async () => {
          throw new Error('網路不通')
        },
      }),
    })
    expect(await checkForUpdate()).toEqual({ state: 'error', message: '網路不通' })
  })
})

describe('watchForUpdates', () => {
  it('新的 service worker 接手時重新載入頁面，而且只重載一次', () => {
    const listeners: Record<string, () => void> = {}
    stubServiceWorker({
      addEventListener: (type: string, fn: () => void) => {
        listeners[type] = fn
      },
    })
    const reload = vi.fn()
    vi.stubGlobal('window', { ...window, location: { ...window.location, reload } })

    watchForUpdates()
    expect(listeners.controllerchange).toBeTypeOf('function')

    listeners.controllerchange()
    listeners.controllerchange()
    listeners.controllerchange()

    // 舊版 Safari 會連續丟這個事件，重載超過一次就會變成無限迴圈
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('瀏覽器不支援時什麼都不做', () => {
    vi.stubGlobal('navigator', {})
    expect(() => watchForUpdates()).not.toThrow()
  })
})
