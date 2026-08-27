import { PERIOD_ORDER, WEEKDAYS } from '../constants'
import type { Course, Period, Session, Weekday } from '../types'
import { periodSpanTime, timeToMinutes } from './dates'

/** 節次在課表上的列索引（0 起算）。用 PERIOD_ORDER 而不是數字大小。 */
export function periodIndex(p: Period): number {
  return PERIOD_ORDER.indexOf(p)
}

/**
 * 把一個時段的節次切成數段「顯示上連續」的區塊。
 * 資料上 ps 應該本來就連續，但萬一不連續也不能讓格子錯位。
 */
export function splitContiguous(ps: Period[]): Period[][] {
  const sorted = [...ps].sort((a, b) => periodIndex(a) - periodIndex(b))
  const runs: Period[][] = []
  for (const p of sorted) {
    const last = runs[runs.length - 1]
    if (last && periodIndex(p) === periodIndex(last[last.length - 1]) + 1) last.push(p)
    else runs.push([p])
  }
  return runs
}

export interface GridBlock {
  key: string
  course: Course
  session: Session
  d: Weekday
  ps: Period[]
  /** 0 起算的列索引，對應 PERIOD_ORDER */
  rowStart: number
  rowSpan: number
  start: string
  end: string
}

export interface WeekLayout {
  blocks: GridBlock[]
  /** `${d}-${periodIndex}` 的集合，用來判斷哪些格子是空的 */
  occupied: Set<string>
  /** 整天沒課的星期 */
  emptyDays: Weekday[]
}

export function buildWeekLayout(courses: Course[]): WeekLayout {
  const blocks: GridBlock[] = []
  const occupied = new Set<string>()

  for (const course of courses) {
    for (const [si, session] of course.sessions.entries()) {
      for (const [ri, run] of splitContiguous(session.ps).entries()) {
        const { start, end } = periodSpanTime(run)
        blocks.push({
          key: `${course.id}-${si}-${ri}`,
          course,
          session,
          d: session.d,
          ps: run,
          rowStart: periodIndex(run[0]),
          rowSpan: run.length,
          start,
          end,
        })
        for (const p of run) occupied.add(`${session.d}-${periodIndex(p)}`)
      }
    }
  }

  const emptyDays = WEEKDAYS.filter((d) => !blocks.some((b) => b.d === d))
  return { blocks, occupied, emptyDays }
}

export interface DayClass {
  key: string
  course: Course
  session: Session
  ps: Period[]
  start: string
  end: string
  teacher: string
}

/** 某一天的課，照時間排序。 */
export function classesOnWeekday(courses: Course[], d: Weekday): DayClass[] {
  const list: DayClass[] = []
  for (const course of courses) {
    for (const [si, session] of course.sessions.entries()) {
      if (session.d !== d) continue
      for (const [ri, run] of splitContiguous(session.ps).entries()) {
        const { start, end } = periodSpanTime(run)
        list.push({
          key: `${course.id}-${si}-${ri}`,
          course,
          session,
          ps: run,
          start,
          end,
          teacher: session.teacher ?? course.teacher,
        })
      }
    }
  }
  return list.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
}

export function totalCredits(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + c.credits, 0)
}

