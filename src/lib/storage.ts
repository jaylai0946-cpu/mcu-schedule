import { LEGACY_SEMESTER_PLACEHOLDER, SCHEMA_VERSION, SEMESTER_DEFAULT, STORAGE_KEY } from '../constants'
import { SEED_COURSES, createSeedState } from '../seed'
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

/**
 * 115-1 選課定案後新增的課。schema v4 -> v5 用它補進已經存在裝置上的課表。
 * 當時有幾門還在等遞補，後來的 migration 會再處理上或沒上；
 * 已經從種子資料移除的課號在這裡找不到，就自然跳過。
 */
const ADDED_COURSE_IDS_V5 = ['assembly', 'jpn', 'sdg', 'career', 'defense', 'logic']

/**
 * 補上使用者還沒有的課。以課號比對：課號一樣就當成已經有了，不重複加，
 * 使用者自己改過的名稱、教室、時間也不動。
 */
function addNewCourses(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses
  const existing = new Set(
    raw.courses.map((c) => (typeof c === 'object' && c !== null ? (c as { code?: unknown }).code : undefined)),
  )
  const missing = SEED_COURSES.filter(
    (c) => ADDED_COURSE_IDS_V5.includes(c.id) && !existing.has(c.code),
  )
  return [...raw.courses, ...structuredClone(missing)]
}

/**
 * 修別。schema v5 -> v6 依課號補上，使用者自己設過的不覆蓋。
 * 中國文學、大一英文、體育、人工智慧、邏輯與批判思考、職場素養、國防
 * 這幾門的修別是照一般的課程架構判斷的，在「編輯課表」可以自己改。
 */
const CATEGORY_BY_CODE_V6: Record<string, 'required' | 'elective' | 'general'> = {
  '52125': 'required', // 會計學（一）
  '55125': 'required', // 經濟學（一）
  M1101: 'required', // 企業概論
  '00911': 'required', // 人工智慧概論
  '00121': 'required', // 體育（壹）
  '00997': 'required', // 班會
  '00999': 'required', // 週會
  '00123': 'general', // 中國文學鑑賞與創作（一）
  '01115': 'general', // 大一英文（一）
  '00759': 'general', // 邏輯與批判思考
  '00531': 'elective', // 日文一（上）
  '57476': 'elective', // 永續發展目標績效管理實務
  '00936': 'elective', // 職場素養與實務
  '00934': 'elective', // 全民國防教育軍事訓練（四）
}

/** v6 當時只知道是夜間，還沒有節次代碼表，先用一行說明頂著。 */
const DEFENSE_TIME_NOTE_V6 = '星期一 夜間（節次代碼 50、60）　B401'

/**
 * v7：拿到台北校區完整的節次代碼表（40 以上是夜間），
 * 全民國防的「一 50、60」終於排得進格子了。
 */
function applyDefenseSession(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses
  return raw.courses.map((course) => {
    if (typeof course !== 'object' || course === null) return course
    const c = course as { code?: unknown; sessions?: unknown }
    // 只補「還沒有時段」的那筆，使用者自己排過的不動
    if (c.code !== '00934' || !Array.isArray(c.sessions) || c.sessions.length > 0) return course
    const next = { ...c, sessions: [{ d: 1, ps: [50, 60], room: 'B401' }] } as Record<string, unknown>
    delete next.timeNote
    return next
  })
}

function applyCategories(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses
  return raw.courses.map((course) => {
    if (typeof course !== 'object' || course === null) return course
    const c = course as { code?: unknown; category?: unknown; timeNote?: unknown; sessions?: unknown }
    const next: Record<string, unknown> = { ...c }
    if (c.category === undefined && typeof c.code === 'string' && CATEGORY_BY_CODE_V6[c.code]) {
      next.category = CATEGORY_BY_CODE_V6[c.code]
    }
    // 只有還沒排到時段的那筆才需要這行說明；v7 之後就會被真正的時段取代
    const noSessions = Array.isArray(c.sessions) && c.sessions.length === 0
    if (c.code === '00934' && c.timeNote === undefined && noSessions) {
      next.timeNote = DEFENSE_TIME_NOTE_V6
    }
    return next
  })
}

/**
 * 遞補結果出來了（115-1 選課定案表）：
 * 職場素養與實務補上了，選別是通識；全民國防（四）和邏輯與批判思考沒上。
 * 官方的「選別」欄也確定了中國文學和大一英文是必修，不是通識。
 */
const ENROLLED_V8 = '00936'
/**
 * 一開始以為沒上的就該刪掉，後來確認三門都還在候補清單上等，
 * 所以這裡不刪任何課，只處理「補上了」和修別。
 */
const NOT_ENROLLED_V8: string[] = []
const CATEGORY_FIX_V8: Record<string, 'required' | 'general'> = {
  '00936': 'general', // 職場素養與實務・選別 5
  '00123': 'required', // 中國文學鑑賞與創作（一）・選別 1
  '01115': 'required', // 大一英文（一）・選別 1
}

function applyEnrolmentResult(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses

  return raw.courses
    .filter((course) => {
      if (typeof course !== 'object' || course === null) return true
      const c = course as { code?: unknown; waitlisted?: unknown }
      // 沒上的才刪。使用者自己把「待遞補」取消掉的，代表他知道自己有上，不動
      return !(typeof c.code === 'string' && NOT_ENROLLED_V8.includes(c.code) && c.waitlisted === true)
    })
    .map((course) => {
      if (typeof course !== 'object' || course === null) return course
      const c = course as { code?: unknown; waitlisted?: unknown; category?: unknown }
      if (typeof c.code !== 'string') return course

      const next: Record<string, unknown> = { ...c }
      if (c.code === ENROLLED_V8 && c.waitlisted === true) delete next.waitlisted
      // 修別只改「還是我當初猜的那個值」的，使用者自己設過的不動
      const fix = CATEGORY_FIX_V8[c.code]
      if (fix && (c.category === 'elective' || c.category === 'general') && c.category !== fix) {
        next.category = fix
      }
      return next
    })
}

/**
 * 把指定課號的課補回來（沿用種子資料那筆）。
 * 只補「整筆不見」的，使用者自己改過的不動。
 */
function addCoursesByCode(raw: Record<string, unknown>, codes: string[]): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses

  const have = new Set(
    raw.courses.map((c) =>
      typeof c === 'object' && c !== null ? (c as { code?: unknown }).code : undefined,
    ),
  )
  const missing = SEED_COURSES.filter((c) => codes.includes(c.code) && !have.has(c.code))
  return missing.length > 0 ? [...raw.courses, ...structuredClone(missing)] : raw.courses
}

/**
 * 115-1 最後一版選課定案表（9/9）：全民國防教育軍事訓練（四）補上了，
 * 選別 5 是通識；候補清單上剩下的兩門就不留了。
 */
const ENROLLED_V11 = '00934'
const NOT_ENROLLED_V11 = ['00933', '00759']

function applyFinalEnrolment(raw: Record<string, unknown>): unknown {
  if (!Array.isArray(raw.courses)) return raw.courses

  return raw.courses
    .filter((course) => {
      if (typeof course !== 'object' || course === null) return true
      const c = course as { code?: unknown; waitlisted?: unknown }
      // 只刪還掛著「待遞補」的那兩門；使用者自己取消掉待遞補的代表他有上，留著
      return !(typeof c.code === 'string' && NOT_ENROLLED_V11.includes(c.code) && c.waitlisted === true)
    })
    .map((course) => {
      if (typeof course !== 'object' || course === null) return course
      const c = course as { code?: unknown; waitlisted?: unknown; category?: unknown }
      if (c.code !== ENROLLED_V11 || c.waitlisted !== true) return course

      const next: Record<string, unknown> = { ...c }
      delete next.waitlisted
      // 修別只改「還是我當初猜的選修」的，使用者自己設過的不動
      if (c.category === 'elective') next.category = 'general'
      return next
    })
}

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
  // 4 -> 5：選課定案。補上週會、日文一（上）、永續發展目標績效管理實務，
  //         以及當時還在等遞補的課；已經有同課號的就不重複加。
  4: (raw) => ({ ...raw, courses: addNewCourses(raw), version: 5 }),
  // 5 -> 6：課塊照必修／選修／通識上色，依課號補修別；
  //         順便補上全民國防查到的夜間時段說明。
  5: (raw) => ({ ...raw, courses: applyCategories(raw), version: 6 }),
  // 6 -> 7：節次代碼表到手，全民國防的「一 50、60」排進課表的夜間列。
  6: (raw) => ({ ...raw, courses: applyDefenseSession(raw), version: 7 }),
  // 7 -> 8：遞補結果。職場素養補上（通識），國防和邏輯沒上就刪掉，
  //         中國文學和大一英文照官方的選別改回必修。
  7: (raw) => ({ ...raw, courses: applyEnrolmentResult(raw), version: 8 }),
  // 8 -> 9：v8 一開始把全民國防也刪掉了，後來決定留著等。已經升到 v8 的
  //         裝置補回來（還在 v7 的走上面那步就不會被刪，這裡就沒事做）。
  8: (raw) => ({ ...raw, courses: addCoursesByCode(raw, ['00934']), version: 9 }),
  // 9 -> 10：候補清單上還有兩門在等——邏輯與批判思考（v8 誤刪，補回來）
  //          和全民國防（三）。這兩門後來確定沒上，種子資料已經拿掉，
  //          所以這一步現在補不到東西，留著只是為了讓版本鏈接得起來。
  9: (raw) => ({ ...raw, courses: addCoursesByCode(raw, ['00759', '00933']), version: 10 }),
  // 10 -> 11：9/9 的選課定案表。全民國防（四）補上了，選別是通識；
  //           候補的全民國防（三）和邏輯與批判思考不再等了，刪掉。
  10: (raw) => ({ ...raw, courses: applyFinalEnrolment(raw), version: 11 }),
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
