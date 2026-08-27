import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../App'
import { createSeedState } from '../seed'
import { loadSyncConfig } from '../lib/sync'
import { loadState } from '../lib/storage'

const ENDPOINT = 'https://sync.example.workers.dev'
const KEY = 'abcdefghij0123456789abcdefghij01'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const spy = vi.fn(async (url: string, init?: RequestInit) => handler(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function gotoSettings() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '設定' }))
}

function enableSync() {
  fireEvent.change(screen.getByLabelText('同步伺服器網址'), { target: { value: ENDPOINT } })
  fireEvent.change(screen.getByLabelText(/密鑰/), { target: { value: KEY } })
  fireEvent.click(screen.getByRole('button', { name: '啟用同步' }))
}

describe('啟用前的檢查', () => {
  it('http 網址會被擋下來', () => {
    stubFetch(() => jsonResponse({}))
    gotoSettings()
    fireEvent.change(screen.getByLabelText('同步伺服器網址'), {
      target: { value: 'http://sync.example.com' },
    })
    fireEvent.change(screen.getByLabelText(/密鑰/), { target: { value: KEY } })
    fireEvent.click(screen.getByRole('button', { name: '啟用同步' }))

    expect(screen.getByRole('alert')).toHaveTextContent('必須是 https')
    expect(loadSyncConfig()).toBeNull()
  })

  it('密鑰格式不對會被擋下來', () => {
    gotoSettings()
    fireEvent.change(screen.getByLabelText('同步伺服器網址'), { target: { value: ENDPOINT } })
    fireEvent.change(screen.getByLabelText(/密鑰/), { target: { value: '太短了' } })
    fireEvent.click(screen.getByRole('button', { name: '啟用同步' }))

    expect(screen.getByRole('alert')).toHaveTextContent('32 個小寫英數字')
    expect(loadSyncConfig()).toBeNull()
  })

  it('產生新密鑰會填出合法的密鑰', () => {
    gotoSettings()
    fireEvent.click(screen.getByRole('button', { name: '產生新密鑰' }))
    expect((screen.getByLabelText(/密鑰/) as HTMLInputElement).value).toMatch(/^[a-z0-9]{32}$/)
  })

  it('會警告密鑰就是憑證', () => {
    gotoSettings()
    expect(screen.getByText(/拿到密鑰的人就拿得到你的資料/)).toBeInTheDocument()
  })
})

describe('啟用之後', () => {
  it('雲端還沒有資料時，把這台的推上去', async () => {
    const spy = stubFetch((_url, init) =>
      (init?.method ?? 'GET') === 'GET'
        ? new Response('', { status: 404 })
        : jsonResponse({ updatedAt: '2026-08-27T05:00:00.000Z' }),
    )

    gotoSettings()
    enableSync()

    await waitFor(() => expect(screen.getByText(/已同步/)).toBeInTheDocument())
    expect(spy.mock.calls.map((c) => c[1]?.method ?? 'GET')).toEqual(['GET', 'PUT'])
    expect(loadSyncConfig()).toMatchObject({ lastSeen: '2026-08-27T05:00:00.000Z', dirty: false })
  })

  it('雲端有資料且本機沒改動時，套用雲端的', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'exam',
      title: '電腦上加的考試',
      date: '2026-12-01',
      done: false,
      createdAt: '2026-08-27T00:00:00.000Z',
    })
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T06:00:00.000Z', state: remote }))

    gotoSettings()
    enableSync()

    await waitFor(() => expect(loadState().state.items).toHaveLength(1))
    expect(loadState().state.items[0].title).toBe('電腦上加的考試')
  })

  it('連不上時如實回報，本機資料不動', async () => {
    stubFetch(() => {
      throw new Error('Failed to fetch')
    })

    gotoSettings()
    enableSync()

    await waitFor(() => expect(screen.getByText(/同步失敗/)).toBeInTheDocument())
    expect(screen.getByText(/本機資料沒有受影響/)).toBeInTheDocument()
    expect(loadState().state.courses).toHaveLength(8)
  })

  it('顯示密鑰之後看得到完整那一組，方便填到第二台', async () => {
    stubFetch(() => new Response('', { status: 404 }))
    gotoSettings()
    enableSync()

    await waitFor(() => expect(screen.getByRole('button', { name: '顯示密鑰' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '顯示密鑰' }))
    expect(screen.getByText(KEY)).toBeInTheDocument()
  })

  it('停用會清掉本機設定', async () => {
    stubFetch(() => new Response('', { status: 404 }))
    gotoSettings()
    enableSync()

    await waitFor(() => expect(screen.getByRole('button', { name: '停用同步' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '停用同步' }))

    expect(loadSyncConfig()).toBeNull()
    expect(screen.getByLabelText('同步伺服器網址')).toBeInTheDocument()
  })
})

describe('衝突', () => {
  it('兩邊都改過時不自動選，把兩邊的內容都講清楚', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'hw',
      title: '雲端的',
      date: '2026-12-01',
      done: false,
      createdAt: '',
    })
    localStorage.setItem(
      'mcu-schedule.sync',
      JSON.stringify({ endpoint: ENDPOINT, key: KEY, lastSeen: '很久以前', dirty: true }),
    )
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T07:00:00.000Z', state: remote }))

    gotoSettings()

    await waitFor(() => expect(screen.getByText(/兩邊都改過，我不會自己選/)).toBeInTheDocument())
    const box = screen.getByRole('alert')
    expect(box).toHaveTextContent('這台：8 門課、0 筆待辦')
    expect(box).toHaveTextContent('雲端：8 門課、1 筆待辦')
    expect(within(box).getByRole('button', { name: '用這台的，覆蓋雲端' })).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: '用雲端的，覆蓋這台' })).toBeInTheDocument()
    // 還沒選之前，本機資料不能被動到
    expect(loadState().state.items).toEqual([])
  })

  it('選「用雲端的」才會套用', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'hw',
      title: '雲端的',
      date: '2026-12-01',
      done: false,
      createdAt: '',
    })
    localStorage.setItem(
      'mcu-schedule.sync',
      JSON.stringify({ endpoint: ENDPOINT, key: KEY, lastSeen: '很久以前', dirty: true }),
    )
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T07:00:00.000Z', state: remote }))

    gotoSettings()
    await waitFor(() => expect(screen.getByText(/兩邊都改過/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '用雲端的，覆蓋這台' }))

    await waitFor(() => expect(loadState().state.items[0]?.title).toBe('雲端的'))
    expect(loadSyncConfig()).toMatchObject({ lastSeen: '2026-08-27T07:00:00.000Z', dirty: false })
  })
})

describe('第二台裝置啟用', () => {
  it('本機還沒動過就直接吃雲端的，不用選', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'hw',
      title: '手機上加的',
      date: '2026-12-01',
      done: false,
      createdAt: '',
    })
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T08:00:00.000Z', state: remote }))

    gotoSettings()
    enableSync()

    await waitFor(() => expect(loadState().state.items[0]?.title).toBe('手機上加的'))
    expect(screen.queryByText(/兩邊都改過/)).not.toBeInTheDocument()
  })

  it('本機已經有自己的改動時，還是要問過才蓋', async () => {
    const remote = createSeedState()
    remote.items.push({
      id: 'r1',
      kind: 'hw',
      title: '雲端的',
      date: '2026-12-01',
      done: false,
      createdAt: '',
    })
    stubFetch(() => jsonResponse({ updatedAt: '2026-08-27T08:00:00.000Z', state: remote }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增' }))
    fireEvent.change(screen.getByLabelText('標題'), { target: { value: '這台加的' } })
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-11-01' } })
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    fireEvent.click(screen.getByRole('button', { name: '設定' }))
    enableSync()

    await waitFor(() => expect(screen.getByText(/兩邊都改過，我不會自己選/)).toBeInTheDocument())
    expect(loadState().state.items[0].title).toBe('這台加的')
  })
})
