import type { ItemKind, Period, SchoolEventKind, Weekday } from './types'

/** 目前的 schema 版本。改動 AppState 結構時 +1，並在 migrations 補上升級函式。 */
export const SCHEMA_VERSION = 3

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

export const SCHOOL_EVENT_KIND_NAMES: Record<SchoolEventKind, string> = {
  term: '學期',
  exam: '考試',
  holiday: '放假',
  other: '其他',
}

/** 「接下來」要往後看幾天的學校行事曆。再遠的只在行事曆分頁看得到。 */
export const SCHOOL_EVENT_LOOKAHEAD_DAYS = 30

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
 * 115 學年度第 1 學期的起訖，取自官方行事曆：
 * 9/7 預定舊生註冊、開學、正式上課；1/4-1/8 期末學習評量週（1/11 寒假開始）。
 */
export const SEMESTER_DEFAULT = { start: '2026-09-07', end: '2027-01-08' }

/**
 * 拿到官方行事曆之前用的暫定值。schema v2 -> v3 的升級會把還停在這組值的
 * 舊資料換成 SEMESTER_DEFAULT；使用者自己改過的則原封不動。
 */
export const LEGACY_SEMESTER_PLACEHOLDER = { start: '2026-09-14', end: '2027-01-17' }

export const DEFAULT_REMIND_DAYS_BEFORE = 1
