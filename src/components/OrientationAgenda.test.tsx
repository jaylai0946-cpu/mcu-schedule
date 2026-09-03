import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { orientationDaysFor } from '../data/orientation'
import type { SchoolEvent } from '../types'
import { UpNext } from './UpNext'

const noop = () => {}

function renderUpNext(event: SchoolEvent, today = '2026-09-01') {
  render(
    <UpNext
      items={[]}
      courses={[]}
      schoolEvents={[event]}
      today={today}
      defaultRemindDaysBefore={1}
      onAdd={noop}
      onToggle={noop}
      onDelete={noop}
      onOpenCalendar={noop}
    />,
  )
}

const ORIENTATION: SchoolEvent = {
  id: 'e1',
  kind: 'other',
  title: '台北校區新生入學輔導',
  start: '2026-09-03',
}

const CHECKUP: SchoolEvent = {
  id: 'e2',
  kind: 'other',
  title: '桃園校區新生入學輔導；台北校區新生健康檢查；台北校區新生轉學生陽光心靈檢測暨職涯測評',
  start: '2026-09-04',
}

describe('orientationDaysFor', () => {
  it('9/3 的入學輔導配到當天的課程配當表', () => {
    const days = orientationDaysFor(ORIENTATION)
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2026-09-03')
    // 原表 16 個項次，一列都不能少
    expect(days[0].tables[0].rows).toHaveLength(16)
    expect(days[0].tables[0].columns).toEqual(['項次', '時間', '課程配當', '使用時間', '附記'])
  })

  it('9/4 的體檢與心靈檢測配到兩張分配表', () => {
    const days = orientationDaysFor(CHECKUP)
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2026-09-04')
    expect(days[0].tables.map((t) => t.rows.length)).toEqual([8, 6])
  })

  it('只是日期涵蓋到、標題對不上的事件不會被貼上表', () => {
    // 暑假從 8 月一路蓋到 9/6，不能因此就長出兩天的表
    expect(
      orientationDaysFor({ title: '暑假', start: '2026-08-01', end: '2026-09-06' }),
    ).toEqual([])
  })

  it('日期沒涵蓋到就不配', () => {
    expect(orientationDaysFor({ title: '台北校區新生入學輔導', start: '2026-09-05' })).toEqual([])
  })
})

describe('接下來的表格', () => {
  it('入學輔導那列畫出課程配當表，附記帶上國企一甲的教室', () => {
    renderUpNext(ORIENTATION)

    const row = screen.getByText('台北校區新生入學輔導').closest('li')!
    expect(within(row).getByText('課程配當表（08:30–16:30）')).toBeInTheDocument()

    const table = within(row).getByRole('table')
    expect(within(table).getByText('項次')).toBeInTheDocument()
    expect(within(table).getByText('08：30 前')).toBeInTheDocument()
    expect(within(table).getByText(/始業式（含院系旗進場）/)).toBeInTheDocument()
    expect(within(table).getAllByText(/國企一甲：D103/)).toHaveLength(3)
  })

  it('體檢那列畫出兩張時間分配表', () => {
    renderUpNext(CHECKUP)

    const row = screen.getByText(CHECKUP.title).closest('li')!
    const tables = within(row).getAllByRole('table')
    expect(tables).toHaveLength(2)
    expect(within(tables[0]).getByText(/國企一甲/)).toBeInTheDocument()
    expect(within(tables[0]).getByText('08：10~09：00')).toBeInTheDocument()
    expect(within(tables[1]).getByText('AI 學程、財金系、國企系')).toBeInTheDocument()
  })

  it('可以縮放，按鈕到底就停住', () => {
    renderUpNext(ORIENTATION)

    const row = screen.getByText('台北校區新生入學輔導').closest('li')!
    const zoomIn = within(row).getByRole('button', { name: '放大' })
    const value = within(row).getByText(/%$/)
    const before = Number(value.textContent!.replace('%', ''))

    fireEvent.click(zoomIn)
    expect(Number(value.textContent!.replace('%', ''))).toBe(before + 10)

    // 一路按到上限就停在 200%，而且按鈕會 disabled
    for (let i = 0; i < 30; i++) fireEvent.click(zoomIn)
    expect(value).toHaveTextContent('200%')
    expect(zoomIn).toBeDisabled()

    fireEvent.click(within(row).getByRole('button', { name: '重設' }))
    expect(value).toHaveTextContent(`${before}%`)
  })

  it('一般的學校日期不會多出表格', () => {
    renderUpNext({ id: 'e3', kind: 'term', title: '開學', start: '2026-09-07' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
