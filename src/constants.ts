import type { ItemKind, Period, Weekday } from './types'

/** 目前的 schema 版本。改動 AppState 結構時 +1，並在 migrations 補上升級函式。 */
export const SCHEMA_VERSION = 1

export const STORAGE_KEY = 'mcu-schedule.state.v1'

/** 銘傳台北校區節次時間，寫死成常數。 */
export const PERIOD_TIMES: Record<Period, { start: string; end: string }> = {
  1: { start: '08:10', end: '09:00' },
  2: { start: '09:10', end: '10:00' },
  3: { start: '10:10', end: '11:00' },
  4: { start: '11:10', end: '12:00' },
  20: { start: '12:10', end: '13:00' },
  5: { start: '13:10', end: '14:00' },
  6: { start: '14:10', end: '15:00' },
  7: { start: '15:10', end: '16:00' },
  8: { start: '16:10', end: '17:00' },
}

/**
 * 課表格子的顯示順序。20 夾在 4 和 5 中間，
 * 所以不能用數字大小排序，一律以這個陣列的索引為準。
 */
export const PERIOD_ORDER: Period[] = [1, 2, 3, 4, 20, 5, 6, 7, 8]

export const LUNCH_PERIOD: Period = 20

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
}

export const KIND_NAMES: Record<ItemKind, string> = {
  exam: '考試',
  hw: '作業',
  event: '活動',
  other: '其他',
}

/** 課程可選色相，不開自由色票。 */
export const HUE_PRESETS: { hue: number; sat: number; name: string }[] = [
  { hue: 214, sat: 42, name: '藍' },
  { hue: 32, sat: 42, name: '橘' },
  { hue: 346, sat: 42, name: '玫瑰' },
  { hue: 266, sat: 42, name: '紫' },
  { hue: 152, sat: 42, name: '綠' },
  { hue: 190, sat: 42, name: '青' },
  { hue: 100, sat: 34, name: '橄欖' },
  { hue: 214, sat: 10, name: '灰' },
]

/**
 * 學期起訖的暫定值——銘傳行事曆尚未確認。
 * UI 會比對 state.semester 是否仍等於這組值，相同就顯示「待確認」提示。
 */
export const SEMESTER_PLACEHOLDER = { start: '2026-09-14', end: '2027-01-17' }

export const DEFAULT_REMIND_DAYS_BEFORE = 1
