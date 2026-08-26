import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { addDays, todayISO } from './lib/dates'
import { loadState } from './lib/storage'

beforeEach(() => {
  localStorage.clear()
})

function openForm() {
  fireEvent.click(screen.getByRole('button', { name: '＋ 新增' }))
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('首頁', () => {
  it('沒有待辦時顯示空狀態，不是空白', () => {
    render(<App />)
    expect(screen.getByText(/目前沒有待辦/)).toBeInTheDocument()
  })

  it('列出修課清單與學分合計', () => {
    render(<App />)
    expect(screen.getByText('學分合計')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('15')).toBeInTheDocument()
  })

  it('星期二在週課表上顯示整天沒課', () => {
    render(<App />)
    expect(screen.getAllByText('整天沒課').length).toBeGreaterThan(0)
  })

  it('學期日期還是暫定值時會標示待確認', () => {
    render(<App />)
    expect(screen.getByText(/尚未對過銘傳行事曆/)).toBeInTheDocument()
  })
})

describe('新增待辦', () => {
  it('明天到期的作業，倒數顯示「明天」', () => {
    render(<App />)
    openForm()
    fill('標題', '經濟學習題二')
    fill('日期', addDays(todayISO(), 1))
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    const row = screen.getByText('經濟學習題二').closest('li')!
    expect(within(row).getByText('明天')).toBeInTheDocument()
    // 存完表單要收起來
    expect(screen.queryByLabelText('標題')).not.toBeInTheDocument()
  })

  it('今天到期顯示「今天」，過期顯示「N 天前」', () => {
    render(<App />)
    openForm()
    fill('標題', '今天要交的')
    fill('日期', todayISO())
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    openForm()
    fill('標題', '上週就該交的')
    fill('日期', addDays(todayISO(), -3))
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    expect(within(screen.getByText('今天要交的').closest('li')!).getByText('今天')).toBeInTheDocument()
    expect(
      within(screen.getByText('上週就該交的').closest('li')!).getByText('3 天前'),
    ).toBeInTheDocument()
  })

  it('依日期由近到遠排序', () => {
    render(<App />)
    for (const [title, offset] of [
      ['比較晚的', 10],
      ['最近的', 1],
      ['中間的', 5],
    ] as const) {
      openForm()
      fill('標題', title)
      fill('日期', addDays(todayISO(), offset))
      fireEvent.click(screen.getByRole('button', { name: '存檔' }))
    }

    const titles = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.todo-title')?.textContent)
    expect(titles).toEqual(['最近的', '中間的', '比較晚的'])
  })

  it('標題空白會被擋下並說明原因', () => {
    render(<App />)
    openForm()
    fill('日期', todayISO())
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))
    expect(screen.getByText('標題不能空白')).toBeInTheDocument()
    expect(screen.getByText(/目前沒有待辦/)).toBeInTheDocument()
  })

  it('新增後寫進 localStorage，重新整理還在', () => {
    const { unmount } = render(<App />)
    openForm()
    fill('標題', '會計學小考')
    fill('日期', addDays(todayISO(), 2))
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))
    unmount()

    expect(loadState().state.items.map((i) => i.title)).toEqual(['會計學小考'])
    render(<App />)
    expect(screen.getByText('會計學小考')).toBeInTheDocument()
  })
})

describe('完成與刪除', () => {
  function addOne(title: string) {
    openForm()
    fill('標題', title)
    fill('日期', addDays(todayISO(), 1))
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))
  }

  it('完成的收進可摺疊的已完成區塊', () => {
    render(<App />)
    addOne('企業概論報告')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))

    expect(screen.getByText('已完成（1）')).toBeInTheDocument()
    expect(screen.getByText(/目前沒有待辦/)).toBeInTheDocument()
    expect(screen.getByText('企業概論報告').closest('li')).toHaveAttribute('data-done', 'true')
  })

  it('可以復原', () => {
    render(<App />)
    addOne('大一英文作業')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    fireEvent.click(screen.getByRole('button', { name: '復原' }))
    expect(screen.queryByText(/已完成/)).not.toBeInTheDocument()
  })

  it('刪除會從清單移除', () => {
    render(<App />)
    addOne('人工智慧概論作業')
    fireEvent.click(screen.getByRole('button', { name: '刪除' }))
    expect(screen.queryByText('人工智慧概論作業')).not.toBeInTheDocument()
    expect(loadState().state.items).toEqual([])
  })
})
