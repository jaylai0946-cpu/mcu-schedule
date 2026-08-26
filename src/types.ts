export type Weekday = 1 | 2 | 3 | 4 | 5 // 一到五
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 20 // 20 = 午休/班會時段

export interface Session {
  d: Weekday
  ps: Period[] // 連續節次，例如 [1,2,3]
  room: string
  label?: string // 例如「實習」
  teacher?: string // 有的話覆蓋 course.teacher
}

export interface Course {
  id: string
  name: string
  code: string // 課號
  teacher: string
  credits: number
  hue: number // 0-360，課程色相
  sat: number // 彩度百分比數值，例如 42
  note?: string
  sessions: Session[]
}

export type ItemKind = 'exam' | 'hw' | 'event' | 'other' // 考試 / 作業 / 活動 / 其他

export interface TodoItem {
  id: string
  kind: ItemKind
  title: string
  date: string // 'YYYY-MM-DD'
  time?: string // 'HH:mm'
  courseId?: string
  note?: string
  done: boolean
  remindDaysBefore?: number // 預設 1
  createdAt: string // ISO
}

export interface AppState {
  profile: { school: string; klass: string; term: string; campus: string; code: string }
  semester: { start: string; end: string } // 'YYYY-MM-DD'，用於行事曆匯出的重複範圍
  courses: Course[]
  items: TodoItem[]
  settings: { notificationsEnabled: boolean; defaultRemindDaysBefore: number }
  version: number // schema 版本，之後改結構要能升級舊資料
}
