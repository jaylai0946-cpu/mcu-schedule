export type Weekday = 1 | 2 | 3 | 4 | 5 // 一到五
/**
 * 節次代碼，照學校的編法：1-9 是白天到傍晚，雙位數是特殊時段——
 * 20 是午休／班會，40 以上是夜間課程。
 */
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 20 | 40 | 50 | 60 | 70

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
  /** 修別，決定課塊的顏色 */
  category?: CourseCategory
  /** 沒有時段（時間還沒確定）的課，在清單上用這行說明時間 */
  timeNote?: string
  /** 還在等遞補、還沒真的選上。畫面上用虛線表示，也不算進學分合計 */
  waitlisted?: boolean
  sessions: Session[]
}

/** 修別：必修 / 選修 / 通識。沒填的課不上色。 */
export type CourseCategory = 'required' | 'elective' | 'general'

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

/** 學校行事曆的重要日期。開學、考試週、放假、補課日這類。 */
export type SchoolEventKind = 'term' | 'exam' | 'holiday' | 'other'

export interface SchoolEvent {
  id: string
  kind: SchoolEventKind
  title: string
  start: string // 'YYYY-MM-DD'
  end?: string // 'YYYY-MM-DD'，含當天；沒有就是單日
  note?: string
}

export interface AppState {
  profile: { school: string; klass: string; term: string; campus: string; code: string }
  semester: { start: string; end: string } // 'YYYY-MM-DD'，用於行事曆匯出的重複範圍
  courses: Course[]
  items: TodoItem[]
  /** 學校行事曆。schema v2 才有，舊資料由 migration 補成空陣列 */
  schoolEvents: SchoolEvent[]
  settings: { notificationsEnabled: boolean; defaultRemindDaysBefore: number }
  version: number // schema 版本，之後改結構要能升級舊資料
}
