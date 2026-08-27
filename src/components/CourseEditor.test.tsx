import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { addDays, todayISO } from '../lib/dates'
import { loadState } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

function gotoEditor() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '編輯課表' }))
}

function sessionBox(index = 0) {
  return screen.getAllByRole('group')[index]
}

function pickPeriods(...periods: string[]) {
  for (const p of periods) {
    fireEvent.click(within(sessionBox()).getByRole('button', { name: p }))
  }
}

describe('新增課程的衝堂偵測', () => {
  it('星期一 1-3 節會被擋下，並說明和哪一門課、哪幾節衝突', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))

    fireEvent.change(screen.getByLabelText('課名'), { target: { value: '測試課' } })
    fireEvent.change(screen.getByLabelText('教室'), { target: { value: 'X101' } })
    pickPeriods('1', '2', '3')
    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('星期一 第 1 節、第 2 節、第 3 節：和「會計學（一）」衝堂')
    // 沒有被存進去
    expect(loadState().state.courses.some((c) => c.name === '測試課')).toBe(false)
  })

  it('改到星期二就存得起來', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))

    fireEvent.change(screen.getByLabelText('課名'), { target: { value: '測試課' } })
    fireEvent.change(screen.getByLabelText('教室'), { target: { value: 'X101' } })
    fireEvent.change(screen.getByLabelText('星期'), { target: { value: '2' } })
    pickPeriods('1', '2')
    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))

    const saved = loadState().state.courses.find((c) => c.name === '測試課')!
    expect(saved.sessions).toEqual([{ d: 2, ps: [1, 2], room: 'X101' }])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('沒選節次或沒填教室會說明缺什麼', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))
    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('課名不能空白')
    expect(alert).toHaveTextContent('第 1 個時段還沒選節次')
    expect(alert).toHaveTextContent('第 1 個時段還沒填教室')
  })

  it('一門課可以有多個時段，教室和老師各自獨立', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))

    fireEvent.change(screen.getByLabelText('課名'), { target: { value: '雙時段課' } })
    fireEvent.change(screen.getByLabelText('教室'), { target: { value: 'A101' } })
    fireEvent.change(screen.getByLabelText('星期'), { target: { value: '2' } })
    pickPeriods('1', '2')

    fireEvent.click(screen.getByRole('button', { name: '＋ 加一個時段' }))
    const second = sessionBox(1)
    fireEvent.change(within(second).getByLabelText('教室'), { target: { value: 'B202' } })
    fireEvent.change(within(second).getByLabelText('星期'), { target: { value: '2' } })
    fireEvent.change(within(second).getByLabelText('這段的教師'), { target: { value: '助教' } })
    fireEvent.click(within(second).getByRole('button', { name: '7' }))
    fireEvent.click(within(second).getByRole('button', { name: '8' }))

    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))

    const saved = loadState().state.courses.find((c) => c.name === '雙時段課')!
    expect(saved.sessions).toEqual([
      { d: 2, ps: [1, 2], room: 'A101' },
      { d: 2, ps: [7, 8], room: 'B202', teacher: '助教' },
    ])
  })

  it('自己的兩個時段撞在一起也會被擋', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))
    fireEvent.change(screen.getByLabelText('課名'), { target: { value: '自撞課' } })
    fireEvent.change(screen.getByLabelText('教室'), { target: { value: 'A101' } })
    fireEvent.change(screen.getByLabelText('星期'), { target: { value: '2' } })
    pickPeriods('1', '2')

    fireEvent.click(screen.getByRole('button', { name: '＋ 加一個時段' }))
    const second = sessionBox(1)
    fireEvent.change(within(second).getByLabelText('教室'), { target: { value: 'B202' } })
    fireEvent.change(within(second).getByLabelText('星期'), { target: { value: '2' } })
    fireEvent.click(within(second).getByRole('button', { name: '2' }))

    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))
    expect(screen.getByRole('alert')).toHaveTextContent('自己有兩個時段排在同一節')
  })
})

describe('編輯與刪除課程', () => {
  it('編輯現有課程不會跟自己衝突', () => {
    gotoEditor()
    const row = screen.getByText('經濟學（一）').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '編輯' }))

    fireEvent.change(within(row).getByLabelText('教室'), { target: { value: 'H999' } })
    fireEvent.click(within(row).getByRole('button', { name: '儲存修改' }))

    const saved = loadState().state.courses.find((c) => c.id === 'eco')!
    expect(saved.sessions[0].room).toBe('H999')
    expect(saved.sessions[0].ps).toEqual([2, 3, 4])
  })

  it('刪除要二次確認，取消就不會刪掉', () => {
    gotoEditor()
    const row = screen.getByText('體育（壹）').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '刪除' }))

    expect(screen.getByRole('alert')).toHaveTextContent('確定要刪除「體育（壹）」嗎？')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '取消' }))

    expect(loadState().state.courses).toHaveLength(8)
  })

  it('確定刪除後課程消失，綁在上面的待辦留著但科目清空', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增' }))
    fireEvent.change(screen.getByLabelText('標題'), { target: { value: '體育報告' } })
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: addDays(todayISO(), 3) } })
    fireEvent.change(screen.getByLabelText('科目'), { target: { value: 'pe' } })
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    fireEvent.click(screen.getByRole('button', { name: '編輯課表' }))
    const row = screen.getByText('體育（壹）').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '刪除' }))
    expect(screen.getByRole('alert')).toHaveTextContent('有 1 筆待辦掛在這門課上')
    fireEvent.click(screen.getByRole('button', { name: '確定刪除' }))

    const state = loadState().state
    expect(state.courses.map((c) => c.id)).not.toContain('pe')
    expect(state.items).toHaveLength(1)
    expect(state.items[0].title).toBe('體育報告')
    expect(state.items[0].courseId).toBeUndefined()
  })
})

describe('課程顏色（Industry 主題已移除選擇器）', () => {
  it('新增課程的表單裡沒有顏色選擇器', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))

    expect(screen.queryByText('顏色')).not.toBeInTheDocument()
    for (const name of ['藍', '橘', '玫瑰', '紫', '綠', '青', '橄欖', '灰']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('新課程還是會拿到預設色相，欄位不會缺', () => {
    gotoEditor()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增課程' }))
    fireEvent.change(screen.getByLabelText('課名'), { target: { value: '新課' } })
    fireEvent.change(screen.getByLabelText('教室'), { target: { value: 'X101' } })
    fireEvent.change(screen.getByLabelText('星期'), { target: { value: '2' } })
    fireEvent.click(within(sessionBox()).getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '新增課程' }))

    const saved = loadState().state.courses.find((c) => c.name === '新課')!
    expect(saved.hue).toBe(214)
    expect(saved.sat).toBe(42)
  })

  it('編輯既有課程不會把原本的色相洗掉', () => {
    gotoEditor()
    // 體育（壹）的種子資料是 hue 100 / sat 34
    const row = screen.getByText('體育（壹）').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '編輯' }))
    fireEvent.change(within(row).getByLabelText('教室'), { target: { value: '新體育館' } })
    fireEvent.click(within(row).getByRole('button', { name: '儲存修改' }))

    const saved = loadState().state.courses.find((c) => c.id === 'pe')!
    expect(saved.sessions[0].room).toBe('新體育館')
    expect({ hue: saved.hue, sat: saved.sat }).toEqual({ hue: 100, sat: 34 })
  })
})
