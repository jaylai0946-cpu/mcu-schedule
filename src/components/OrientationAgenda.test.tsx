import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    expect(days[0].slots[0].time).toBe('08:30 前')
  })

  it('9/4 的體檢與心靈檢測配到當天的梯次', () => {
    const days = orientationDaysFor(CHECKUP)
    expect(days).toHaveLength(1)
    expect(days[0].date).toBe('2026-09-04')
    expect(days[0].slots.map((s) => s.time)).toEqual(['08:10–09:00', '10:00 開始'])
  })

  it('只是日期涵蓋到、標題對不上的事件不會被貼上流程', () => {
    // 暑假從 8 月一路蓋到 9/6，不能因此就長出兩天的流程表
    expect(
      orientationDaysFor({ title: '暑假', start: '2026-08-01', end: '2026-09-06' }),
    ).toEqual([])
  })

  it('日期沒涵蓋到就不配', () => {
    expect(orientationDaysFor({ title: '台北校區新生入學輔導', start: '2026-09-05' })).toEqual([])
  })
})

describe('接下來的流程表', () => {
  it('入學輔導那列列出國企一甲的教室和時間', () => {
    renderUpNext(ORIENTATION)

    const row = screen.getByText('台北校區新生入學輔導').closest('li')!
    expect(within(row).getByText('當天流程（08:30–16:30，逸仙堂）')).toBeInTheDocument()
    expect(within(row).getByText('學系時間')).toBeInTheDocument()
    expect(within(row).getAllByText('D103').length).toBeGreaterThan(0)
    expect(within(row).getAllByText('我們班').length).toBe(4)
    expect(within(row).getByText(/身分證正、反面影本/)).toBeInTheDocument()
  })

  it('體檢那列標出國企一甲的梯次', () => {
    renderUpNext(CHECKUP)

    const row = screen.getByText(CHECKUP.title).closest('li')!
    expect(within(row).getByText('新生體檢（第 1 梯）')).toBeInTheDocument()
    expect(within(row).getByText('08:10–09:00')).toBeInTheDocument()
    expect(within(row).getByText('F601、F607、F608、F609、F610')).toBeInTheDocument()
  })

  it('一般的學校日期不會多出流程表', () => {
    renderUpNext({ id: 'e3', kind: 'term', title: '開學', start: '2026-09-07' })
    expect(screen.queryByText(/當天流程/)).not.toBeInTheDocument()
  })
})
