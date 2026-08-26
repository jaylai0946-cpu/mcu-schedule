import { describe, expect, it } from 'vitest'
import { createSeedState } from '../seed'
import type { AppState, TodoItem } from '../types'
import { buildICS, escapeText, firstOccurrence, foldLine } from './ics'

const NOW = new Date('2026-08-27T00:00:00Z')

function stateWith(items: TodoItem[] = []): AppState {
  return { ...createSeedState(), items }
}

/** 把折行接回來，方便用單行比對。 */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n[ \t]/g, '').split('\r\n')
}

function eventFor(ics: string, uidFragment: string): string[] {
  const lines = unfold(ics)
  const start = lines.findIndex((l) => l.startsWith('UID:') && l.includes(uidFragment))
  expect(start).toBeGreaterThan(-1)
  const begin = lines.lastIndexOf('BEGIN:VEVENT', start)
  const end = lines.indexOf('END:VEVENT', start)
  return lines.slice(begin, end + 1)
}

describe('基本結構', () => {
  const ics = buildICS(stateWith(), { now: NOW })

  it('每一行都用 CRLF 結尾', () => {
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics.split('\r\n').slice(0, -1).some((l) => l.includes('\n'))).toBe(false)
  })

  it('有合法的 VCALENDAR 外框', () => {
    const lines = unfold(ics)
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('VERSION:2.0')
    expect(lines).toContain('CALSCALE:GREGORIAN')
    expect(lines.at(-2)).toBe('END:VCALENDAR')
  })

  it('有 Asia/Taipei 的 VTIMEZONE，offset 是 +0800', () => {
    const lines = unfold(ics)
    expect(lines).toContain('BEGIN:VTIMEZONE')
    expect(lines).toContain('TZID:Asia/Taipei')
    expect(lines).toContain('TZOFFSETTO:+0800')
    expect(lines).toContain('END:VTIMEZONE')
  })

  it('BEGIN 和 END 的數量對得起來', () => {
    const lines = unfold(ics)
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(
      lines.filter((l) => l === 'END:VEVENT').length,
    )
  })

  it('沒有任何一行超過 75 個位元組', () => {
    const encoder = new TextEncoder()
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})

describe('課程是週期性事件', () => {
  const ics = buildICS(stateWith(), { now: NOW })

  it('星期一 1-3 節的會計學：一個事件，08:10 到 11:00', () => {
    const event = eventFor(ics, 'course-acc-0-0')
    expect(event).toContain('DTSTART;TZID=Asia/Taipei:20260914T081000')
    expect(event).toContain('DTEND;TZID=Asia/Taipei:20260914T110000')
    expect(event).toContain('SUMMARY:會計學（一）')
    expect(event).toContain('LOCATION:H402')
    expect(event.find((l) => l.startsWith('DESCRIPTION:'))).toContain('許韶纓')
  })

  it('每週重複，星期正確，學期結束後停止', () => {
    const event = eventFor(ics, 'course-acc-0-0')
    // 2027-01-17 23:59:59 台北 = 2027-01-17 15:59:59 UTC
    expect(event).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20270117T155959Z')
  })

  it('DTSTART 落在學期開始後的第一個該星期', () => {
    // 2026-09-14 是星期一
    expect(firstOccurrence('2026-09-14', 1)).toBe('2026-09-14')
    expect(firstOccurrence('2026-09-14', 5)).toBe('2026-09-18')
    expect(firstOccurrence('2026-09-15', 1)).toBe('2026-09-21')
  })

  it('星期五的經濟學用 BYDAY=FR，起訖 09:10-12:00', () => {
    const event = eventFor(ics, 'course-eco-0-0')
    expect(event).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR;UNTIL=20270117T155959Z')
    expect(event).toContain('DTSTART;TZID=Asia/Taipei:20260918T091000')
    expect(event).toContain('DTEND;TZID=Asia/Taipei:20260918T120000')
  })

  it('實習時段是自己的事件，教室和教師都不同', () => {
    const event = eventFor(ics, 'course-acc-1-0')
    expect(event).toContain('SUMMARY:會計學（一）（實習）')
    expect(event).toContain('LOCATION:D105')
    expect(event).toContain('RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20270117T155959Z')
    expect(event).toContain('DTSTART;TZID=Asia/Taipei:20260917T151000')
    expect(event.find((l) => l.startsWith('DESCRIPTION:'))).toContain('陳映蓉')
  })

  it('午休的班會是 12:10-13:00', () => {
    const event = eventFor(ics, 'course-hr-0-0')
    expect(event).toContain('DTSTART;TZID=Asia/Taipei:20260916T121000')
    expect(event).toContain('DTEND;TZID=Asia/Taipei:20260916T130000')
  })

  it('9 個時段就是 9 個事件', () => {
    expect(unfold(ics).filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(9)
  })
})

describe('待辦是單次事件', () => {
  const items: TodoItem[] = [
    {
      id: 'i1',
      kind: 'exam',
      title: '經濟學第一次期中考',
      date: '2026-11-05',
      time: '09:10',
      courseId: 'eco',
      done: false,
      remindDaysBefore: 3,
      createdAt: '2026-08-27T00:00:00.000Z',
    },
    {
      id: 'i2',
      kind: 'hw',
      title: '企業概論分組報告',
      date: '2026-10-20',
      courseId: 'biz',
      note: '第 3 章，要交紙本',
      done: false,
      createdAt: '2026-08-27T00:00:00.000Z',
    },
  ]
  const ics = buildICS(stateWith(items), { now: NOW })

  it('有時間的待辦用 TZID，預設一小時', () => {
    const event = eventFor(ics, 'item-i1')
    expect(event).toContain('DTSTART;TZID=Asia/Taipei:20261105T091000')
    expect(event).toContain('DTEND;TZID=Asia/Taipei:20261105T101000')
    expect(event).toContain('SUMMARY:經濟學第一次期中考')
    expect(event).not.toContain('RRULE')
  })

  it('提前三天提醒', () => {
    const event = eventFor(ics, 'item-i1')
    expect(event).toContain('BEGIN:VALARM')
    expect(event).toContain('TRIGGER:-P3D')
    expect(event).toContain('ACTION:DISPLAY')
  })

  it('沒填時間的當成全天事件，DTEND 是隔天', () => {
    const event = eventFor(ics, 'item-i2')
    expect(event).toContain('DTSTART;VALUE=DATE:20261020')
    expect(event).toContain('DTEND;VALUE=DATE:20261021')
  })

  it('沒填提醒天數時用設定裡的預設值', () => {
    expect(eventFor(ics, 'item-i2')).toContain('TRIGGER:-P1D')
  })

  it('描述裡有類型、科目和備註', () => {
    const line = eventFor(ics, 'item-i2').find((l) => l.startsWith('DESCRIPTION:'))!
    expect(line).toContain('作業')
    expect(line).toContain('企業概論')
    expect(line).toContain('要交紙本')
  })

  it('提前 0 天時觸發時間是事件當下', () => {
    const zero = buildICS(stateWith([{ ...items[0], remindDaysBefore: 0 }]), { now: NOW })
    expect(eventFor(zero, 'item-i1')).toContain('TRIGGER:-PT0M')
  })
})

describe('只匯出待辦', () => {
  const items: TodoItem[] = [
    {
      id: 'i1',
      kind: 'exam',
      title: '會計學期中考',
      date: '2026-11-10',
      done: false,
      createdAt: '2026-08-27T00:00:00.000Z',
    },
  ]

  it('不含任何課程事件', () => {
    const ics = buildICS(stateWith(items), { includeCourses: false, now: NOW })
    expect(ics).not.toContain('RRULE')
    expect(unfold(ics).filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(ics).toContain('SUMMARY:會計學期中考')
  })

  it('只匯出課程時不含待辦', () => {
    const ics = buildICS(stateWith(items), { includeItems: false, now: NOW })
    expect(ics).not.toContain('會計學期中考')
    expect(unfold(ics).filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(9)
  })
})

describe('跳脫與折行', () => {
  it('分號、逗號、反斜線、換行都要跳脫', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })

  it('中文不會被從字元中間切開', () => {
    const long = `SUMMARY:${'中'.repeat(40)}`
    const folded = foldLine(long)
    expect(folded).toContain('\r\n ')
    expect(folded.replace(/\r\n /g, '')).toBe(long)
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('短的行不折', () => {
    expect(foldLine('SUMMARY:abc')).toBe('SUMMARY:abc')
  })

  it('標題含分號的待辦不會把後面的欄位吃掉', () => {
    const ics = buildICS(
      stateWith([
        {
          id: 'i9',
          kind: 'other',
          title: '報告;含分號,含逗號',
          date: '2026-10-01',
          done: false,
          createdAt: '2026-08-27T00:00:00.000Z',
        },
      ]),
      { includeCourses: false, now: NOW },
    )
    expect(unfold(ics)).toContain('SUMMARY:報告\\;含分號\\,含逗號')
  })
})
