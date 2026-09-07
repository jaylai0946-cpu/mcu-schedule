import { describe, expect, it } from 'vitest'
import { ACADEMIC_CALENDAR } from '../data/academicCalendar'
import { buildDayMarks, eventsInRow, markForTitle } from './almanacMarks'

const [FIRST, SECOND] = ACADEMIC_CALENDAR.map((s) => buildDayMarks(s))

describe('markForTitle', () => {
  it('評量週算考試', () => {
    expect(markForTitle('期中學習評量週')).toBe('exam')
    expect(markForTitle('期末學習評量週')).toBe('exam')
    expect(markForTitle('畢業學期評量週')).toBe('exam')
  })

  it('放假、補假、假期算放假', () => {
    expect(markForTitle('國慶日補假')).toBe('holiday')
    expect(markForTitle('共同休假')).toBe('holiday')
    expect(markForTitle('中秋節')).toBe('holiday')
    expect(markForTitle('行憲紀念日')).toBe('holiday')
    expect(markForTitle('除夕')).toBe('holiday')
    expect(markForTitle('國慶日')).toBe('holiday')
    expect(markForTitle('寒假開始')).toBe('holiday')
  })

  it('招生考試、說明會這些不標', () => {
    expect(markForTitle('預定碩士班、博士班甄試招生考試')).toBeNull()
    expect(markForTitle('第一次高中英語聽力測驗')).toBeNull()
    expect(markForTitle('校務會議')).toBeNull()
    expect(markForTitle('第18屆創辦人紀念音樂會')).toBeNull()
    expect(markForTitle('國家防災日地震避難演練')).toBeNull()
    // 標題裡有「寒假」但講的是註冊報到，不是放假
    expect(markForTitle('預定寒假轉學生註冊報到')).toBeNull()
  })
})

describe('讀事項欄', () => {
  const row = ACADEMIC_CALENDAR[0].rows.find((r) => r.events.includes('國慶日'))!

  it('拆得出每一段的日數和標題', () => {
    expect(eventsInRow(row)).toEqual([
      { title: '國慶日補假', isos: ['2026-10-09'] },
      { title: '國慶日', isos: ['2026-10-10'] },
      // 跨月的報名期間解不出日數，但標題還是留著（反正也不會被標記）
      { title: '預定碩士班、博士班甄試網路報名', isos: [] },
    ])
  })

  it('區間會展開成每一天', () => {
    const midterm = ACADEMIC_CALENDAR[0].rows.find((r) => r.events.startsWith('(2-6)期中'))!
    expect(eventsInRow(midterm)[0].isos).toHaveLength(5)
  })
})

describe('第 1 學期的標記', () => {
  it('期中評量週 11/2–11/6 五天都標成考試', () => {
    for (const iso of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']) {
      expect(FIRST.get(iso)?.mark).toBe('exam')
    }
    // 週末不在區間內，不能被順手標到
    expect(FIRST.get('2026-11-07')?.mark).not.toBe('exam')
  })

  it('期末評量週 1/4–1/8 標成考試', () => {
    expect(FIRST.get('2027-01-04')?.mark).toBe('exam')
    expect(FIRST.get('2027-01-08')?.mark).toBe('exam')
  })

  it('國定假日與補假標成放假', () => {
    expect(FIRST.get('2026-10-10')?.mark).toBe('holiday') // 國慶日
    expect(FIRST.get('2026-10-09')?.mark).toBe('holiday') // 國慶日補假
    expect(FIRST.get('2026-10-25')?.mark).toBe('holiday') // 光復節
    expect(FIRST.get('2026-12-25')?.mark).toBe('holiday') // 行憲紀念日
  })

  it('picks 收不到的假日也標得到（元旦只寫在事項欄裡）', () => {
    expect(FIRST.get('2027-01-01')?.mark).toBe('holiday')
    expect(FIRST.get('2027-01-01')?.titles).toContain('元旦')
  })

  it('寒假、暑假整列都算放假', () => {
    expect(FIRST.get('2026-08-03')?.mark).toBe('holiday')
    expect(FIRST.get('2027-01-18')?.mark).toBe('holiday')
  })

  it('上課日不標', () => {
    expect(FIRST.get('2026-09-07')).toBeUndefined() // 開學正式上課
    expect(FIRST.get('2026-11-16')).toBeUndefined()
  })

  it('標起來的日子都說得出理由', () => {
    for (const [iso, mark] of FIRST) {
      expect(mark.titles.length, iso).toBeGreaterThan(0)
    }
  })
})

describe('第 2 學期的標記', () => {
  it('期中評量週 4/19–4/23、期末評量週 6/21–6/25', () => {
    expect(SECOND.get('2027-04-19')?.mark).toBe('exam')
    expect(SECOND.get('2027-04-23')?.mark).toBe('exam')
    expect(SECOND.get('2027-06-21')?.mark).toBe('exam')
    expect(SECOND.get('2027-06-25')?.mark).toBe('exam')
  })

  it('除夕與春節這一段標成放假', () => {
    expect(SECOND.get('2027-02-05')?.mark).toBe('holiday') // 除夕
  })

  it('「(2、7)校慶補假」這種頓號寫法兩天都標到', () => {
    expect(SECOND.get('2027-04-02')?.mark).toBe('holiday')
    expect(SECOND.get('2027-04-07')?.mark).toBe('holiday')
    expect(SECOND.get('2027-04-05')?.titles).toContain('清明節')
  })
})
