import { describe, expect, it } from 'vitest'
import type { SchoolEvent } from '../types'
import {
  eventLengthDays,
  formatRange,
  lastDay,
  schoolEventStatus,
  sortSchoolEvents,
  upcomingSchoolEvents,
} from './schoolCalendar'

const TODAY = '2026-11-02'

function ev(partial: Partial<SchoolEvent> & { id: string; start: string }): SchoolEvent {
  return { kind: 'exam', title: '期中考週', ...partial }
}

describe('單日與區間', () => {
  it('沒有 end 就是單日', () => {
    const e = ev({ id: 'a', start: '2026-11-09' })
    expect(lastDay(e)).toBe('2026-11-09')
    expect(eventLengthDays(e)).toBe(1)
    expect(formatRange(e)).toBe('11/09')
  })

  it('有 end 就是區間，長度含頭尾', () => {
    const e = ev({ id: 'a', start: '2026-11-09', end: '2026-11-13' })
    expect(eventLengthDays(e)).toBe(5)
    expect(formatRange(e)).toBe('11/09–11/13')
  })
})

describe('schoolEventStatus', () => {
  it('還沒開始就倒數', () => {
    const s = schoolEventStatus(ev({ id: 'a', start: '2026-11-09' }), TODAY)
    expect(s.label).toBe('7 天後')
    expect(s.tone).toBe('normal')
    expect(s.ongoing).toBe(false)
  })

  it('三天內到期用強調色', () => {
    expect(schoolEventStatus(ev({ id: 'a', start: '2026-11-04' }), TODAY).tone).toBe('soon')
  })

  it('明天開始', () => {
    expect(schoolEventStatus(ev({ id: 'a', start: '2026-11-03' }), TODAY).label).toBe('明天')
  })

  it('今天開始的單日事件是進行中', () => {
    const s = schoolEventStatus(ev({ id: 'a', start: TODAY }), TODAY)
    expect(s.ongoing).toBe(true)
    expect(s.label).toBe('進行中')
  })

  it('區間中間的某天：進行中，並算出還剩幾天', () => {
    const s = schoolEventStatus(ev({ id: 'a', start: '2026-10-30', end: '2026-11-05' }), TODAY)
    expect(s.ongoing).toBe(true)
    expect(s.finished).toBe(false)
    // label 要短，長的說明放 detail，否則窄螢幕的倒數欄會被撐成三行
    expect(s.label).toBe('進行中')
    expect(s.detail).toBe('還有 3 天結束')
  })

  it('區間最後一天：進行中但不再說還有幾天', () => {
    const s = schoolEventStatus(ev({ id: 'a', start: '2026-10-30', end: TODAY }), TODAY)
    expect(s.label).toBe('進行中')
    expect(s.detail).toBeUndefined()
  })

  it('整段結束了就標成過去', () => {
    const s = schoolEventStatus(ev({ id: 'a', start: '2026-10-20', end: '2026-10-24' }), TODAY)
    expect(s.finished).toBe(true)
    expect(s.tone).toBe('overdue')
    expect(s.label).toBe('13 天前')
  })
})

describe('upcomingSchoolEvents', () => {
  const events = [
    ev({ id: 'past', start: '2026-09-14', title: '開學日', kind: 'term' }),
    ev({ id: 'now', start: '2026-11-01', end: '2026-11-04', title: '校慶' }),
    ev({ id: 'soon', start: '2026-11-09', end: '2026-11-13' }),
    ev({ id: 'far', start: '2027-01-15', title: '期末考', kind: 'exam' }),
  ]

  it('排除已經結束的，保留進行中的', () => {
    expect(upcomingSchoolEvents(events, TODAY).map((e) => e.id)).toEqual(['now', 'soon'])
  })

  it('超出往後看的天數就不列入', () => {
    expect(upcomingSchoolEvents(events, TODAY, 5).map((e) => e.id)).toEqual(['now'])
  })

  it('拉長天數就看得到期末考', () => {
    expect(upcomingSchoolEvents(events, TODAY, 400).map((e) => e.id)).toEqual(['now', 'soon', 'far'])
  })

  it('依開始日排序', () => {
    const shuffled = [events[3], events[1], events[2]]
    expect(sortSchoolEvents(shuffled).map((e) => e.id)).toEqual(['now', 'soon', 'far'])
  })
})
