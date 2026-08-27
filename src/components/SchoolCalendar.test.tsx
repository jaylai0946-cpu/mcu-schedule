import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { addDays, todayISO } from '../lib/dates'
import { buildICS } from '../lib/ics'
import { loadState } from '../lib/storage'

beforeEach(() => {
  localStorage.clear()
})

function gotoCalendar() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '學校行事曆' }))
}

function addEvent(title: string, start: string, end?: string, kind?: string) {
  fireEvent.click(screen.getByRole('button', { name: '＋ 新增重要日期' }))
  fireEvent.change(screen.getByLabelText('標題'), { target: { value: title } })
  fireEvent.change(screen.getByLabelText('開始日'), { target: { value: start } })
  if (end) fireEvent.change(screen.getByLabelText('結束日'), { target: { value: end } })
  if (kind) fireEvent.change(screen.getByLabelText('類型'), { target: { value: kind } })
  fireEvent.click(screen.getByRole('button', { name: '新增' }))
}

describe('新增學校重要日期', () => {
  it('空的時候有引導文案，不是空白', () => {
    gotoCalendar()
    expect(screen.getByText(/還沒登記任何學校日期/)).toBeInTheDocument()
  })

  it('新增單日事件會存起來', () => {
    gotoCalendar()
    addEvent('開學日', '2026-09-14', undefined, 'term')

    const saved = loadState().state.schoolEvents
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ title: '開學日', start: '2026-09-14', kind: 'term' })
    expect(saved[0].end).toBeUndefined()
  })

  it('新增區間會保留結束日', () => {
    gotoCalendar()
    addEvent('期中考週', addDays(todayISO(), 7), addDays(todayISO(), 11))
    expect(loadState().state.schoolEvents[0].end).toBe(addDays(todayISO(), 11))
  })

  it('結束日早於開始日會被擋下並說明', () => {
    gotoCalendar()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增重要日期' }))
    fireEvent.change(screen.getByLabelText('標題'), { target: { value: '亂填的' } })
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-11-13' } })
    fireEvent.change(screen.getByLabelText('結束日'), { target: { value: '2026-11-09' } })
    fireEvent.click(screen.getByRole('button', { name: '新增' }))

    expect(screen.getByRole('alert')).toHaveTextContent('結束日期不能早於開始日期')
    expect(loadState().state.schoolEvents).toEqual([])
  })

  it('標題空白會被擋下', () => {
    gotoCalendar()
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增重要日期' }))
    fireEvent.click(screen.getByRole('button', { name: '新增' }))
    expect(screen.getByRole('alert')).toHaveTextContent('標題不能空白')
  })
})

describe('併入首頁的「接下來」', () => {
  it('近期的學校日期會出現在接下來，並標成學校', () => {
    gotoCalendar()
    addEvent('期中考週', addDays(todayISO(), 7), addDays(todayISO(), 11))

    fireEvent.click(screen.getByRole('button', { name: '首頁' }))
    const row = screen.getByText('期中考週').closest('li')!
    expect(row).toHaveAttribute('data-school', 'true')
    expect(within(row).getByText('7 天後')).toBeInTheDocument()
    expect(within(row).getByText('學校')).toBeInTheDocument()
  })

  it('進行中的區間排在最上面並顯示進行中', () => {
    gotoCalendar()
    addEvent('校慶週', addDays(todayISO(), -1), addDays(todayISO(), 2))
    addEvent('期中考週', addDays(todayISO(), 5))

    fireEvent.click(screen.getByRole('button', { name: '首頁' }))
    const titles = screen.getAllByRole('listitem').map((li) => li.querySelector('.todo-title')?.textContent)
    expect(titles[0]).toBe('校慶週')
    const row = screen.getByText('校慶週').closest('li')!
    expect(within(row).getByText('進行中')).toBeInTheDocument()
    expect(within(row).getByText('還有 2 天結束')).toBeInTheDocument()
  })

  it('和個人待辦一起依日期排序', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增' }))
    fireEvent.change(screen.getByLabelText('標題'), { target: { value: '會計學作業' } })
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: addDays(todayISO(), 3) } })
    fireEvent.click(screen.getByRole('button', { name: '存檔' }))

    fireEvent.click(screen.getByRole('button', { name: '學校行事曆' }))
    addEvent('期中考週', addDays(todayISO(), 1))
    fireEvent.click(screen.getByRole('button', { name: '首頁' }))

    const titles = screen.getAllByRole('listitem').map((li) => li.querySelector('.todo-title')?.textContent)
    expect(titles).toEqual(['期中考週', '會計學作業'])
  })

  it('已經過去的不會出現在接下來，而是收在行事曆分頁的摺疊區', () => {
    gotoCalendar()
    addEvent('上週的活動', addDays(todayISO(), -10))

    fireEvent.click(screen.getByRole('button', { name: '首頁' }))
    expect(screen.queryByText('上週的活動')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '學校行事曆' }))
    expect(screen.getByText('已經過去的（1）')).toBeInTheDocument()
  })
})

describe('學期起訖帶入與匯出', () => {
  it('可以從登記過的日期帶入開學日與最後上課日', () => {
    gotoCalendar()
    addEvent('開學日', '2026-09-21', undefined, 'term')
    addEvent('最後上課日', '2027-01-08', undefined, 'term')

    fireEvent.change(screen.getByLabelText('從行事曆帶入開學日'), {
      target: { value: '2026-09-21' },
    })
    fireEvent.change(screen.getByLabelText('從行事曆帶入最後上課日'), {
      target: { value: '2027-01-08' },
    })

    const semester = loadState().state.semester
    expect(semester).toEqual({ start: '2026-09-21', end: '2027-01-08' })
    expect(buildICS(loadState().state)).toContain('UNTIL=20270108T155959Z')
  })

  it('改完之後首頁不再顯示待確認', () => {
    gotoCalendar()
    fireEvent.change(screen.getByLabelText('最後上課日'), { target: { value: '2027-01-08' } })
    fireEvent.click(screen.getByRole('button', { name: '首頁' }))
    expect(screen.queryByText(/尚未對過銘傳行事曆/)).not.toBeInTheDocument()
  })

  it('新增的日期會一起匯出到 .ics', () => {
    gotoCalendar()
    addEvent('期末考週', '2027-01-11', '2027-01-15')
    expect(buildICS(loadState().state)).toContain('SUMMARY:期末考週')
  })
})

describe('編輯與刪除', () => {
  it('刪除要二次確認', () => {
    gotoCalendar()
    addEvent('國慶日', addDays(todayISO(), 20))

    const row = screen.getByText('國慶日').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '刪除' }))
    expect(screen.getByRole('alert')).toHaveTextContent('確定要刪除「國慶日」嗎？')

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '取消' }))
    expect(loadState().state.schoolEvents).toHaveLength(1)

    fireEvent.click(within(row).getByRole('button', { name: '刪除' }))
    fireEvent.click(screen.getByRole('button', { name: '確定刪除' }))
    expect(loadState().state.schoolEvents).toEqual([])
  })

  it('編輯改得動日期', () => {
    gotoCalendar()
    addEvent('期中考週', addDays(todayISO(), 7))

    const row = screen.getByText('期中考週').closest('.editor-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '編輯' }))
    fireEvent.change(within(row).getByLabelText('開始日'), { target: { value: '2026-11-16' } })
    fireEvent.click(within(row).getByRole('button', { name: '儲存修改' }))

    const saved = loadState().state.schoolEvents
    expect(saved).toHaveLength(1)
    expect(saved[0].start).toBe('2026-11-16')
  })
})
