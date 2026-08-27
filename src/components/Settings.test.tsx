import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { exportJSON, loadState } from '../lib/storage'
import { createSeedState } from '../seed'

beforeEach(() => {
  localStorage.clear()
})

function gotoSettings() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '設定' }))
}

describe('匯出說明', () => {
  it('說明課程會重複到哪一天，以及日期是官方的還是自己改的', () => {
    gotoSettings()
    expect(screen.getByText(/2027-01-08/)).toBeInTheDocument()
    expect(screen.getByText(/取自官方行事曆/)).toBeInTheDocument()
  })
})

describe('通知限制要誠實寫出來', () => {
  it('說明關掉分頁不會響，以及沒有背景排程時已降級', () => {
    gotoSettings()
    expect(screen.getByText(/關掉分頁之後不會響/)).toBeInTheDocument()
    expect(screen.getByText(/不會假裝排到了/)).toBeInTheDocument()
  })

  it('預設提前天數改了會存起來', () => {
    gotoSettings()
    fireEvent.change(screen.getByLabelText('預設提前幾天提醒'), { target: { value: '3' } })
    expect(loadState().state.settings.defaultRemindDaysBefore).toBe(3)
  })
})

describe('JSON 備份', () => {
  it('匯入合法備份會整份還原', async () => {
    const backup = createSeedState()
    backup.items.push({
      id: 'x1',
      kind: 'exam',
      title: '從備份還原的考試',
      date: '2026-12-01',
      done: false,
      createdAt: '2026-08-27T00:00:00.000Z',
    })

    gotoSettings()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportJSON(backup)], 'backup.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(
      () => expect(screen.getByText(/已還原：8 門課、1 筆待辦/)).toBeInTheDocument(),
      { timeout: 5000 },
    )
    expect(loadState().state.items[0].title).toBe('從備份還原的考試')
  })

  it('壞掉的備份會被拒絕，而且不動到現有資料', async () => {
    gotoSettings()
    const before = loadState().state

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['這不是 JSON'], 'bad.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(
      () => expect(screen.getByText(/匯入失敗，資料沒有被動到/)).toBeInTheDocument(),
      { timeout: 5000 },
    )
    expect(loadState().state).toEqual(before)
  })
})

describe('行事曆匯出按鈕', () => {
  it('按下去會觸發一次 .ics 下載，檔名是 mcu-schedule.ics', () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clicks: string[] = []
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    }

    try {
      gotoSettings()
      fireEvent.click(screen.getByRole('button', { name: '匯出全部（課程＋待辦＋學校日期）' }))
      fireEvent.click(screen.getByRole('button', { name: '只匯出待辦與學校日期' }))
      expect(clicks).toEqual(['mcu-schedule.ics', 'mcu-todo.ics'])
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
      vi.unstubAllGlobals()
    }
  })
})

describe('外觀切換', () => {
  it('選深色會在 html 上加 data-theme，選跟隨系統會拿掉', () => {
    gotoSettings()
    fireEvent.click(screen.getByRole('button', { name: '深色' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: '跟隨系統' }))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
