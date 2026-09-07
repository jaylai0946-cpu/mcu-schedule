import type { CSSProperties } from 'react'
import type { Course, CourseCategory } from '../types'

/**
 * 課塊的色相。日系主題用 hsl(H S 94%/82%/34%) 三段算出底、框、字，
 * 這裡只決定 H 和 S。
 *
 * 交接稿建議一課一色；改成一個修別一個色相——使用者要的是「一眼看出
 * 必修／選修／通識」，一課一色只是好看而已。數值照參考庫的七色。
 */
const CATEGORY_HUE: Record<CourseCategory, number> = {
  required: 205, // 空
  elective: 160, // 若竹
  general: 35, // 山吹
}

/** 沒有修別的課用中性藍灰，才不會看起來像某一類。 */
const DEFAULT_HUE = 205

/** 0 學分的行政時段（班會、週會）：低彩度，讓正課先被看到。 */
const MUTED = { hue: 30, sat: 14 }

export function courseHue(course: Course): { hue: number; sat: number } {
  if (course.credits === 0) return MUTED
  return { hue: course.category ? CATEGORY_HUE[course.category] : DEFAULT_HUE, sat: 34 }
}

/** 掛在課塊 style 上的兩個 CSS 變數。 */
export function courseColorStyle(course: Course): CSSProperties {
  const { hue, sat } = courseHue(course)
  return { '--h': String(hue), '--s': `${sat}%` } as CSSProperties
}
