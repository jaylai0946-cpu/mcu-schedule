import { LEGACY_SEMESTER_PLACEHOLDER, SCHEMA_VERSION, SEMESTER_DEFAULT, STORAGE_KEY } from '../constants'
import { createSeedState } from '../seed'
import type { AppState } from '../types'
import { validateAppState } from './validate'

export const CORRUPT_KEY = `${STORAGE_KEY}.corrupt`

/**
 * 115-1 開學前學校換掉的教室。schema v3 -> v4 用它來更新已經存在裝置上的
 * 課表——種子資料只在全新安裝時才會用到，光改種子資料手機上是不會變的。
 * 比對課程 id、星期和舊教室三個條件都相同才換，使用者自己改過的不動。
 */
const ROOM_MOVES_V4: { courseId: string; d: number; from: string; to: string }[] = [
  { courseId: 'chi', d: 1, from: 'D206', to: 'B302' }, // 中國文學鑑賞與創作（一）
  { courseId: 'ai', d: 3, from: 'F610', to: 'D305' }, // 人工智慧概論
  { courseId: 'hr', d: 3, from: 'D106', to: 'B102' }, // 班會
  { courseId: 'acc', d: 4, from: 'D105', to: 'B102' }, // 會計學（一）實習
]

/** 把還停在舊教室的時段換成新教室；其餘原封不動地回傳。 */
function applyRoomMoves(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses
  return raw.courses.map((course) => {
    if (typeof course !== 'object' || course === null) return course
    const c = course as { id?: unknown; sessions?: unknown }
    if (!Array.isArray(c.sessions)) return course
    return {
      ...c,
      sessions: c.sessions.map((session) => {
        if (typeof session !== 'object' || session === null) return session
        const s = session as { d?: unknown; room?: unknown }
        const move = ROOM_MOVES_V4.find(
          (m) => m.courseId === c.id && m.d === s.d && m.from === s.room,
        )
        return move ? { ...s, room: move.to } : session
      }),
    }
  })
}

export type LoadSource = 'stored' | 'seed' | 'recovered'

export interface LoadResult {
  state: AppState
  source: LoadSource
  /** source 為 'recovered' 時說明原本壞在哪裡。 */
  error?: string
}

/**
 * 由舊版 schema 升級到新版。key 是「來源版本」，
 * 每個函式只負責 N -> N+1，loadState 會一路串到 SCHEMA_VERSION。
 * 改動 AppState 結構時：SCHEMA_VERSION +1，並在這裡補一個函式。
 */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // 0 -> 1：最初的版本，只補上缺漏的欄位，不丟資料。
  0: (raw) => ({ ...raw, version: 1 }),
  // 1 -> 2：加入學校行事曆。舊資料沒有這個欄位，補一個空陣列就好。
  1: (raw) => ({ ...raw, schoolEvents: raw.schoolEvents ?? [], version: 2 }),
  // 2 -> 3：拿到官方行事曆了。只換掉「還停在暫定值」的，
  //         使用者自己改過的日期不能動。
  2: (raw) => {
    const semester = raw.semester as { start?: string; end?: string } | undefined
    const untouched =
      semester?.start === LEGACY_SEMESTER_PLACEHOLDER.start &&
      semester?.end === LEGACY_SEMESTER_PLACEHOLDER.end
    return {
      ...raw,
      semester: untouched ? { ...SEMESTER_DEFAULT } : raw.semester,
      version: 3,
    }
  },
  // 3 -> 4：學校換教室。只換掉「還停在舊教室」的時段，
  //         使用者自己改過的不能動。
  3: (raw) => ({ ...raw, courses: applyRoomMoves(raw), version: 4 }),
}

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw
  let version = typeof current.version === 'number' ? current.version : 0
  while (version < SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) break
    current = step(current)
    version = typeof current.version === 'number' ? current.version : version + 1
  }
  return { ...current, version: SCHEMA_VERSION }
}

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function loadState(): LoadResult {
  if (!hasStorage()) return { state: createSeedState(), source: 'seed' }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    // 第一次開啟，或使用者清掉了資料——用種子資料重建。
    const state = createSeedState()
    writeRaw(state)
    return { state, source: 'seed' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return recover(raw, e instanceof Error ? e.message : 'JSON 解析失敗')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return recover(raw, '資料不是物件')
  }

  const result = validateAppState(migrate(parsed as Record<string, unknown>))
  if (!result.ok) return recover(raw, result.error)

  return { state: result.state, source: 'stored' }
}

/** 壞掉的資料另存一份備查，畫面用種子資料撐住而不是崩潰。 */
function recover(rawText: string, error: string): LoadResult {
  try {
    localStorage.setItem(CORRUPT_KEY, rawText)
  } catch {
    // 存不下就算了，不能讓救援流程自己再炸一次
  }
  return { state: createSeedState(), source: 'recovered', error }
}

function writeRaw(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string }

/** 寫入前先驗證，驗不過就不動 localStorage，舊資料保持原狀。 */
export function saveState(state: AppState): SaveResult {
  const result = validateAppState(state)
  if (!result.ok) return { ok: false, error: result.error }
  if (!hasStorage()) return { ok: false, error: '這個瀏覽器不支援 localStorage' }
  return writeRaw(result.state)
    ? { ok: true }
    : { ok: false, error: '寫入失敗，可能是儲存空間已滿' }
}

/** 匯出備份用的 JSON 字串。 */
export function exportJSON(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

/** 匯入備份。驗不過就回錯誤，呼叫端不要套用。 */
export function importJSON(text: string): { ok: true; state: AppState } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: '不是合法的 JSON 檔' }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: '備份內容不是物件' }
  }
  const result = validateAppState(migrate(parsed as Record<string, unknown>))
  return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error }
}
