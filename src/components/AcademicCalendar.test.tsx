import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { ACADEMIC_CALENDAR } from '../data/academicCalendar'
import { loadState } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

function gotoAlmanac() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '行事曆' }))
}

describe('官方行事曆檢視', () => {
  it('整份表格都畫出來，列數和資料一致', () => {
    gotoAlmanac()
    const table = screen.getByRole('table')
    // 表頭 1 列 + 資料列
    expect(within(table).getAllByRole('row')).toHaveLength(ACADEMIC_CALENDAR[0].rows.length + 1)
    expect(within(table).getByText('全校重大活動舉辦事項')).toBeInTheDocument()
  })

  it('看得到開學那一列的內容', () => {
    gotoAlmanac()
    expect(screen.getByText(/預定舊生註冊、開學、正式上課/)).toBeInTheDocument()
  })

  it('可以切到第 2 學期', () => {
    gotoAlmanac()
    fireEvent.click(screen.getByRole('button', { name: '115 學年度第 2 學期' }))
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(ACADEMIC_CALENDAR[1].rows.length + 1)
  })

  it('標出資料來源', () => {
    gotoAlmanac()
    expect(screen.getByText(/教育部核定/)).toBeInTheDocument()
  })
})

describe('縮放', () => {
  it('放大縮小會改變百分比與實際的 zoom', () => {
    gotoAlmanac()
    const before = Number(screen.getByText(/%$/).textContent!.replace('%', ''))

    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    expect(Number(screen.getByText(/%$/).textContent!.replace('%', ''))).toBe(before + 10)

    fireEvent.click(screen.getByRole('button', { name: '縮小' }))
    fireEvent.click(screen.getByRole('button', { name: '縮小' }))
    expect(Number(screen.getByText(/%$/).textContent!.replace('%', ''))).toBe(before - 10)

    const zoomed = screen.getByRole('table').parentElement!
    expect(zoomed.style.zoom).toBe(String((before - 10) / 100))
  })

  it('重設會回到預設倍率', () => {
    gotoAlmanac()
    const before = screen.getByText(/%$/).textContent
    fireEvent.click(screen.getByRole('button', { name: '放大' }))
    fireEvent.click(screen.getByRole('button', { name: '重設' }))
    expect(screen.getByText(/%$/).textContent).toBe(before)
  })

  it('縮到最小和放到最大時按鈕會停用', () => {
    gotoAlmanac()
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: '縮小' }))
    expect(screen.getByRole('button', { name: '縮小' })).toBeDisabled()
    expect(screen.getByText('50%')).toBeInTheDocument()

    for (let i = 0; i < 30; i++) fireEvent.click(screen.getByRole('button', { name: '放大' }))
    expect(screen.getByRole('button', { name: '放大' })).toBeDisabled()
    expect(screen.getByText('200%')).toBeInTheDocument()
  })
})

describe('一鍵加入重要日期', () => {
  it('加進去之後會存起來，而且按鈕變成已加入', () => {
    gotoAlmanac()
    fireEvent.click(screen.getByRole('button', { name: /展開（還有 \d+ 筆）/ }))

    const row = screen.getByText('期末學習評量週').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: '＋ 加入' }))

    const saved = loadState().state.schoolEvents
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      title: '期末學習評量週',
      start: '2027-01-04',
      end: '2027-01-08',
      kind: 'exam',
      note: '來自學校行事曆',
    })
    expect(within(row).getByRole('button', { name: '已加入' })).toBeDisabled()
  })

  it('加進去的會出現在「重要日期」分頁，可以再編輯', () => {
    gotoAlmanac()
    fireEvent.click(screen.getByRole('button', { name: /展開/ }))
    const row = screen.getByText('期中學習評量週').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: '＋ 加入' }))

    fireEvent.click(screen.getByRole('button', { name: '重要日期' }))
    const card = screen.getByText('期中學習評量週').closest('.editor-row') as HTMLElement
    expect(within(card).getByRole('button', { name: '編輯' })).toBeInTheDocument()
    expect(card).toHaveTextContent('共 5 天')
  })

  it('類型會依標題猜：評量算考試、寒假算放假、開學算學期', () => {
    gotoAlmanac()
    fireEvent.click(screen.getByRole('button', { name: /展開/ }))

    for (const [title, kind] of [
      ['期中學習評量週', 'exam'],
      ['寒假開始', 'holiday'],
      ['預定舊生註冊、開學、正式上課', 'term'],
    ] as const) {
      const row = screen.getByText(title).closest('li')!
      fireEvent.click(within(row).getByRole('button', { name: '＋ 加入' }))
      expect(loadState().state.schoolEvents.find((e) => e.title === title)?.kind).toBe(kind)
    }
  })
})

describe('學期起訖', () => {
  it('預設就是官方日期，不顯示改回按鈕', () => {
    gotoAlmanac()
    expect(screen.getByText(/取自這份官方行事曆/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /改回官方日期/ })).not.toBeInTheDocument()
  })

  it('自己改過之後可以一鍵改回官方日期', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '重要日期' }))
    fireEvent.change(screen.getByLabelText('最後上課日'), { target: { value: '2026-12-25' } })

    fireEvent.click(screen.getByRole('button', { name: '行事曆' }))
    fireEvent.click(screen.getByRole('button', { name: /改回官方日期/ }))
    expect(loadState().state.semester).toEqual({ start: '2026-09-07', end: '2027-01-08' })
  })
})
