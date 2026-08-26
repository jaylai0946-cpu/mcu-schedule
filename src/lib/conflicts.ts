import { LUNCH_PERIOD, WEEKDAY_NAMES } from '../constants'
import type { Course, Period, Weekday } from '../types'
import { sortPeriods } from './dates'

export interface Conflict {
  d: Weekday
  ps: Period[]
  /** 撞到的課程名稱；同一門課自己重複時是自己 */
  withName: string
  withLabel?: string
  /** 撞到的是不是草稿自己的另一個時段 */
  selfOverlap: boolean
}

function periodText(ps: Period[]): string {
  return sortPeriods(ps)
    .map((p) => (p === LUNCH_PERIOD ? '午休' : `第 ${p} 節`))
    .join('、')
}

export function describeConflict(c: Conflict): string {
  const where = `${WEEKDAY_NAMES[c.d]} ${periodText(c.ps)}`
  if (c.selfOverlap) return `星期${where}：這門課自己有兩個時段排在同一節`
  const name = c.withLabel ? `${c.withName}（${c.withLabel}）` : c.withName
  return `星期${where}：和「${name}」衝堂`
}

/**
 * 檢查 draft 和現有課程有沒有排在同一節。
 * 同 id 的課視為「正在編輯的那一門」，不跟自己的舊版本比。
 */
export function detectConflicts(draft: Course, courses: Course[]): Conflict[] {
  const conflicts: Conflict[] = []

  // 先看草稿自己的時段有沒有互相重疊
  const seen = new Map<string, number>()
  for (const [si, session] of draft.sessions.entries()) {
    for (const p of session.ps) {
      const key = `${session.d}-${p}`
      const first = seen.get(key)
      if (first !== undefined && first !== si) {
        conflicts.push({ d: session.d, ps: [p], withName: draft.name, selfOverlap: true })
      } else {
        seen.set(key, si)
      }
    }
  }

  // 再和其他課程比
  for (const other of courses) {
    if (other.id === draft.id) continue
    for (const otherSession of other.sessions) {
      const otherSet = new Set<number>(otherSession.ps)
      for (const session of draft.sessions) {
        if (session.d !== otherSession.d) continue
        const hit = session.ps.filter((p) => otherSet.has(p))
        if (hit.length > 0) {
          conflicts.push({
            d: session.d,
            ps: hit,
            withName: other.name,
            withLabel: otherSession.label,
            selfOverlap: false,
          })
        }
      }
    }
  }

  return conflicts
}
