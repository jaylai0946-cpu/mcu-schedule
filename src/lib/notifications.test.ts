import { describe, expect, it } from 'vitest'
import { createSeedState } from '../seed'
import type { AppState, TodoItem } from '../types'
import { reminderText, remindersForToday } from './notifications'

const TODAY = '2026-11-02'

function item(partial: Partial<TodoItem> & { id: string; date: string }): TodoItem {
  return {
    kind: 'hw',
    title: '作業',
    done: false,
    createdAt: '2026-08-27T00:00:00.000Z',
    ...partial,
  }
}

function stateWith(items: TodoItem[], defaultRemind = 1): AppState {
  const seed = createSeedState()
  return { ...seed, items, settings: { ...seed.settings, defaultRemindDaysBefore: defaultRemind } }
}

describe('remindersForToday', () => {
  it('提前 1 天：明天到期的今天提醒', () => {
    const state = stateWith([item({ id: 'a', date: '2026-11-03', remindDaysBefore: 1 })])
    expect(remindersForToday(state, TODAY).map((r) => r.item.id)).toEqual(['a'])
  })

  it('提前 3 天：三天後到期的今天提醒，兩天後的不提醒', () => {
    const state = stateWith([
      item({ id: 'a', date: '2026-11-05', remindDaysBefore: 3 }),
      item({ id: 'b', date: '2026-11-04', remindDaysBefore: 3 }),
    ])
    expect(remindersForToday(state, TODAY).map((r) => r.item.id)).toEqual(['a'])
  })

  it('沒填提醒天數時吃設定裡的預設值', () => {
    const state = stateWith([item({ id: 'a', date: '2026-11-04' })], 2)
    expect(remindersForToday(state, TODAY).map((r) => r.item.id)).toEqual(['a'])
  })

  it('已完成的不提醒', () => {
    const state = stateWith([item({ id: 'a', date: '2026-11-03', remindDaysBefore: 1, done: true })])
    expect(remindersForToday(state, TODAY)).toEqual([])
  })

  it('提前 0 天：當天提醒', () => {
    const state = stateWith([item({ id: 'a', date: TODAY, remindDaysBefore: 0 })])
    expect(remindersForToday(state, TODAY).map((r) => r.item.id)).toEqual(['a'])
  })

  it('已經過期的不會再提醒', () => {
    const state = stateWith([item({ id: 'a', date: '2026-10-01', remindDaysBefore: 1 })])
    expect(remindersForToday(state, TODAY)).toEqual([])
  })

  it('有填時間就用該時間，沒填就早上八點', () => {
    const state = stateWith([
      item({ id: 'a', date: '2026-11-03', time: '09:10', remindDaysBefore: 1 }),
      item({ id: 'b', date: '2026-11-03', remindDaysBefore: 1 }),
    ])
    expect(remindersForToday(state, TODAY).map((r) => r.at)).toEqual(['09:10', '08:00'])
  })
})

describe('reminderText', () => {
  it('照規格的格式：「標題」明天 09:10', () => {
    const it1 = item({ id: 'a', date: '2026-11-03', time: '09:10', title: '經濟學第一次期中考' })
    expect(reminderText(it1, TODAY)).toBe('「經濟學第一次期中考」明天 09:10')
  })

  it('沒填時間就不加時間', () => {
    const it2 = item({ id: 'b', date: TODAY, title: '企業概論報告' })
    expect(reminderText(it2, TODAY)).toBe('「企業概論報告」今天')
  })
})
