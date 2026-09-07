import { describe, expect, it } from 'vitest'
import { SEED_COURSES } from '../seed'
import { courseColorStyle, courseHue } from './courseColor'

const find = (id: string) => SEED_COURSES.find((c) => c.id === id)!

describe('courseHue', () => {
  it('必修、選修、通識各一個色相', () => {
    expect(courseHue(find('acc')).hue).toBe(205) // 必修・空
    expect(courseHue(find('jpn')).hue).toBe(160) // 選修・若竹
    expect(courseHue(find('chi')).hue).toBe(35) // 通識・山吹
  })

  it('0 學分的行政時段走低彩度，不跟正課搶注意力', () => {
    expect(courseHue(find('hr'))).toEqual({ hue: 30, sat: 14 }) // 班會
    expect(courseHue(find('assembly'))).toEqual({ hue: 30, sat: 14 }) // 週會
  })

  it('待遞補的課色相照修別走，虛線由 CSS 處理', () => {
    expect(courseHue(find('logic')).hue).toBe(35) // 邏輯與批判思考・通識
  })

  it('輸出的是 CSS 變數，顏色交給樣式表算', () => {
    expect(courseColorStyle(find('acc'))).toEqual({ '--h': '205', '--s': '34%' })
  })
})
