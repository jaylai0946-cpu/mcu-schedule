import { PERIOD_ORDER } from '../constants'
import type {
  AppState,
  Course,
  ItemKind,
  Period,
  SchoolEvent,
  SchoolEventKind,
  Session,
  TodoItem,
  Weekday,
} from '../types'
import { isValidDateString, isValidTimeString, sortPeriods } from './dates'

export type ValidationResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string }

const KINDS: ItemKind[] = ['exam', 'hw', 'event', 'other']
const SCHOOL_KINDS: SchoolEventKind[] = ['term', 'exam', 'holiday', 'other']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function optionalStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function parseSession(raw: unknown, where: string): Session {
  if (!isRecord(raw)) throw new Error(`${where} 不是物件`)
  const d = num(raw.d, 0)
  if (d < 1 || d > 5 || !Number.isInteger(d)) throw new Error(`${where} 的星期 ${raw.d} 不合法`)
  if (!Array.isArray(raw.ps) || raw.ps.length === 0) throw new Error(`${where} 缺少節次`)
  const seen = new Set<number>()
  for (const p of raw.ps) {
    if (!PERIOD_ORDER.includes(p as Period)) throw new Error(`${where} 的節次 ${p} 不合法`)
    if (seen.has(p as number)) throw new Error(`${where} 的節次 ${p} 重複`)
    seen.add(p as number)
  }
  return {
    d: d as Weekday,
    ps: sortPeriods(raw.ps as Period[]),
    room: str(raw.room),
    label: optionalStr(raw.label),
    teacher: optionalStr(raw.teacher),
  }
}

function parseCourse(raw: unknown, index: number): Course {
  if (!isRecord(raw)) throw new Error(`第 ${index + 1} 門課不是物件`)
  const id = str(raw.id)
  if (!id) throw new Error(`第 ${index + 1} 門課缺少 id`)
  if (!Array.isArray(raw.sessions)) throw new Error(`課程 ${id} 缺少 sessions`)
  return {
    id,
    name: str(raw.name),
    code: str(raw.code),
    teacher: str(raw.teacher),
    credits: num(raw.credits, 0),
    hue: num(raw.hue, 214),
    sat: num(raw.sat, 42),
    note: optionalStr(raw.note),
    sessions: raw.sessions.map((s, i) => parseSession(s, `課程 ${id} 的第 ${i + 1} 個時段`)),
  }
}

function parseItem(raw: unknown, index: number): TodoItem {
  if (!isRecord(raw)) throw new Error(`第 ${index + 1} 筆待辦不是物件`)
  const id = str(raw.id)
  if (!id) throw new Error(`第 ${index + 1} 筆待辦缺少 id`)
  if (!isValidDateString(raw.date)) throw new Error(`待辦 ${id} 的日期 ${raw.date} 不合法`)
  const kind = KINDS.includes(raw.kind as ItemKind) ? (raw.kind as ItemKind) : 'other'
  return {
    id,
    kind,
    title: str(raw.title),
    date: raw.date,
    time: isValidTimeString(raw.time) ? raw.time : undefined,
    courseId: optionalStr(raw.courseId),
    note: optionalStr(raw.note),
    done: raw.done === true,
    remindDaysBefore:
      typeof raw.remindDaysBefore === 'number' && raw.remindDaysBefore >= 0
        ? Math.floor(raw.remindDaysBefore)
        : undefined,
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
  }
}

function parseSchoolEvent(raw: unknown, index: number): SchoolEvent {
  if (!isRecord(raw)) throw new Error(`第 ${index + 1} 筆學校行事曆不是物件`)
  const id = str(raw.id)
  if (!id) throw new Error(`第 ${index + 1} 筆學校行事曆缺少 id`)
  if (!isValidDateString(raw.start)) throw new Error(`學校行事曆 ${id} 的開始日期 ${raw.start} 不合法`)
  if (raw.end !== undefined && raw.end !== null && raw.end !== '') {
    if (!isValidDateString(raw.end)) throw new Error(`學校行事曆 ${id} 的結束日期 ${raw.end} 不合法`)
    if (raw.end < raw.start) throw new Error(`學校行事曆 ${id} 的結束日期早於開始日期`)
  }
  return {
    id,
    kind: SCHOOL_KINDS.includes(raw.kind as SchoolEventKind) ? (raw.kind as SchoolEventKind) : 'other',
    title: str(raw.title),
    // 結束日等於開始日的話當成單日，不留多餘欄位
    start: raw.start,
    end: typeof raw.end === 'string' && raw.end > raw.start ? raw.end : undefined,
    note: optionalStr(raw.note),
  }
}

/**
 * 驗證並正規化任意輸入。寫進 localStorage 前一定要先過這關，
 * 驗不過就保留舊資料，不要蓋掉。
 */
export function validateAppState(raw: unknown): ValidationResult {
  try {
    if (!isRecord(raw)) throw new Error('資料不是物件')
    if (!isRecord(raw.profile)) throw new Error('缺少 profile')
    if (!isRecord(raw.semester)) throw new Error('缺少 semester')
    if (!isValidDateString(raw.semester.start)) throw new Error('學期開始日期不合法')
    if (!isValidDateString(raw.semester.end)) throw new Error('學期結束日期不合法')
    if (!Array.isArray(raw.courses)) throw new Error('courses 不是陣列')
    if (!Array.isArray(raw.items)) throw new Error('items 不是陣列')
    // schoolEvents 是 v2 才有的欄位，舊備份沒有就當成空陣列，不要因此整份拒收
    if (raw.schoolEvents !== undefined && !Array.isArray(raw.schoolEvents)) {
      throw new Error('schoolEvents 不是陣列')
    }

    const courses = raw.courses.map(parseCourse)
    const ids = new Set<string>()
    for (const c of courses) {
      if (ids.has(c.id)) throw new Error(`課程 id ${c.id} 重複`)
      ids.add(c.id)
    }

    const settings = isRecord(raw.settings) ? raw.settings : {}

    return {
      ok: true,
      state: {
        profile: {
          school: str(raw.profile.school),
          klass: str(raw.profile.klass),
          term: str(raw.profile.term),
          campus: str(raw.profile.campus),
          code: str(raw.profile.code),
        },
        semester: { start: raw.semester.start, end: raw.semester.end },
        courses,
        items: raw.items.map(parseItem),
        schoolEvents: Array.isArray(raw.schoolEvents)
          ? raw.schoolEvents.map(parseSchoolEvent)
          : [],
        settings: {
          notificationsEnabled: settings.notificationsEnabled === true,
          defaultRemindDaysBefore: Math.max(0, Math.floor(num(settings.defaultRemindDaysBefore, 1))),
        },
        version: num(raw.version, 0),
      },
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
