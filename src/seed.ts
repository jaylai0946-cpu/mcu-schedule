import { SCHEMA_VERSION, SEMESTER_PLACEHOLDER, DEFAULT_REMIND_DAYS_BEFORE } from './constants'
import type { AppState, Course } from './types'

/** 真實課表資料。課名、課號、教師、教室一律照原樣，不要「順手修正」。 */
export const SEED_COURSES: Course[] = [
  {
    id: 'acc',
    name: '會計學（一）',
    code: '52125',
    teacher: '許韶纓',
    credits: 3,
    hue: 214,
    sat: 42,
    sessions: [
      { d: 1, ps: [1, 2, 3], room: 'H402' },
      { d: 4, ps: [7, 8], room: 'D105', label: '實習', teacher: '陳映蓉' },
    ],
  },
  {
    id: 'eco',
    name: '經濟學（一）',
    code: '55125',
    teacher: '施姵全',
    credits: 3,
    hue: 32,
    sat: 42,
    sessions: [{ d: 5, ps: [2, 3, 4], room: 'H402' }],
  },
  {
    id: 'biz',
    name: '企業概論',
    code: 'M1101',
    teacher: '陳律睿',
    credits: 3,
    hue: 346,
    sat: 42,
    sessions: [{ d: 4, ps: [2, 3, 4], room: 'H402' }],
  },
  {
    id: 'ai',
    name: '人工智慧概論',
    code: '00911',
    teacher: '許欽嘉',
    credits: 2,
    hue: 266,
    sat: 42,
    sessions: [{ d: 3, ps: [3, 4], room: 'F610' }],
  },
  {
    id: 'chi',
    name: '中國文學鑑賞與創作（一）',
    code: '00123',
    teacher: '黃青萍',
    credits: 2,
    hue: 152,
    sat: 42,
    sessions: [{ d: 1, ps: [5, 6], room: 'D206' }],
  },
  {
    id: 'eng',
    name: '大一英文（一）',
    code: '01115',
    teacher: '馬家慧',
    credits: 2,
    hue: 190,
    sat: 42,
    sessions: [{ d: 4, ps: [5, 6], room: 'F612' }],
  },
  {
    id: 'pe',
    name: '體育（壹）',
    code: '00121',
    teacher: '廖智雄',
    credits: 0,
    hue: 100,
    sat: 34,
    sessions: [{ d: 3, ps: [1, 2], room: '體育館' }],
  },
  {
    id: 'hr',
    name: '班會',
    code: '00997',
    teacher: '許欽嘉',
    credits: 0,
    hue: 214,
    sat: 10,
    note: '全學年',
    sessions: [{ d: 3, ps: [20], room: 'D106' }],
  },
]

export function createSeedState(): AppState {
  return {
    profile: {
      school: '銘傳大學 國際企業學系 跨境電商經營組',
      klass: '國企一甲',
      term: '115 學年度第 1 學期',
      campus: '台北校區',
      code: '57101',
    },
    semester: { ...SEMESTER_PLACEHOLDER },
    courses: structuredClone(SEED_COURSES),
    items: [],
    // 銘傳 115 學年度的行事曆日期由使用者自己輸入，這裡不預填任何猜測的日期
    schoolEvents: [],
    settings: {
      notificationsEnabled: false,
      defaultRemindDaysBefore: DEFAULT_REMIND_DAYS_BEFORE,
    },
    version: SCHEMA_VERSION,
  }
}
