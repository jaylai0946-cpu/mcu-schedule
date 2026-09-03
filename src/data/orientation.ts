/**
 * 115 學年度台北校區《新生入學輔導》的當天流程。
 * 來源：學校發的「新生入學輔導公告事項」PDF（附表一～附表七），
 * 時間、地點、主持人一律照原文，只挑出跟國企一甲有關的教室。
 *
 * 這份是死資料，不會進 localStorage，也不會被同步覆蓋——
 * 它只是貼在「接下來」那筆學校行事曆下面的說明。
 */

export interface OrientationSlot {
  /** '08：30-09：00' 這種原文的全形冒號改成半形，破折號統一用 – */
  time: string
  title: string
  place?: string
  host?: string
  note?: string
  /** 國企一甲自己要去的場次，會標成「我們班」 */
  mine?: boolean
}

export interface OrientationDay {
  /** 'YYYY-MM-DD' */
  date: string
  /** details 收起來時顯示的那行字 */
  summary: string
  /**
   * 事件標題含這些字之一才貼上這份流程。
   * 只比日期會讓「暑假」那種長區間也吃到，所以要加關鍵字。
   */
  match: string[]
  slots: OrientationSlot[]
  notes: string[]
}

export const ORIENTATION_SOURCE = '銘傳大學台北校區 115 學年度《新生入學輔導》公告事項'

export const ORIENTATION_DAYS: OrientationDay[] = [
  {
    date: '2026-09-03',
    summary: '當天流程（08:30–16:30，逸仙堂）',
    match: ['新生入學輔導'],
    slots: [
      {
        time: '08:30 前',
        title: '報到',
        place: '逸仙堂',
        note: '啦啦舞競賽影片播放',
      },
      {
        time: '08:30–09:00',
        title: '防災疏散演練、校況簡介影片播放、典禮前動作預演',
        place: '逸仙堂',
        host: '各業務承辦教官',
      },
      {
        time: '09:00–09:30',
        title: '始業式（含院系旗進場）',
        place: '逸仙堂',
        host: '校長',
      },
      { time: '09:30–09:45', title: '休息時間' },
      {
        time: '09:45–11:00',
        title: '新生應該如何讀大學',
        place: '逸仙堂',
        host: '教務處',
        note: '含有獎徵答',
      },
      {
        time: '11:00–11:25',
        title: '學院時間',
        place: '逸仙堂',
        host: '院長',
        note: '含移動時間',
        mine: true,
      },
      {
        time: '11:25–11:50',
        title: '學系時間',
        place: 'D103',
        host: '系主任（含系秘書工作報告）',
        note: '含移動時間',
        mine: true,
      },
      {
        time: '11:50–13:20',
        title: '午餐、師生相見歡及導師時間（相互介紹、資料填寫、遴選班級幹部）',
        place: 'D103',
        host: '導師',
        note: '含移動時間；午餐由各院系自行規劃',
        mine: true,
      },
      {
        time: '13:20–13:50',
        title: '系學會工作報告、迎新宿營招募、系籃／系排招生',
        place: 'D103',
        host: '系學會',
        mine: true,
      },
      { time: '13:50–14:15', title: '校園巡禮', note: '含移動時間' },
      {
        time: '14:15–14:20',
        title: '學生會工作報告',
        place: '逸仙堂',
        host: '學生會會長',
      },
      {
        time: '14:20–14:40',
        title: '學生社團活動說明',
        place: '逸仙堂',
        host: '學務處課指組',
      },
      {
        time: '14:40–16:00',
        title: '社團成果發表',
        place: '逸仙堂',
        host: '學務處課指組',
      },
      {
        time: '16:00–16:25',
        title: '社團博覽會',
        place: '逸仙堂',
        host: '學務處課指組',
      },
      {
        time: '16:25–16:30',
        title: '社團博覽會參與回饋抽獎活動',
        place: '逸仙堂',
        host: '學務處課指組',
      },
      { time: '16:30', title: '賦歸' },
    ],
    notes: [
      '逸仙堂座位：第一排（靠講臺）由左至右是會計一甲、財金一甲、國企一甲、企管一甲；疏散走 2 號出口（國企系）。',
      '國企一甲的學系時間、導師時間、系學會時間都在 D103（一乙 D105、一丙 D106）。',
      '視為正式課程，無故缺席開學後要做愛校服務 8 小時；有特殊事故請於 9/1 17:00 前 mail 彭豫立教官 pp@mail.mcu.edu.tw。',
      '服儀端莊大方，不要穿涼鞋、拖鞋。',
      '未役男同學務必攜帶身分證正、反面影本（正反面要裁開或分別影印），要收《兵役調查表》。',
      '每班有 2 位大二服務同學帶隊，學院／學系／導師時間、校園巡禮、午膳調查都跟著他們走。',
    ],
  },
  {
    date: '2026-09-04',
    summary: '當天流程（體檢 08:10、心靈檢測與職涯測評 10:00）',
    match: ['新生健康檢查', '健康檢查', '體檢', '陽光心靈', '職涯測評', '新生入學輔導'],
    slots: [
      {
        time: '08:10–09:00',
        title: '新生體檢（第 1 梯）',
        place: '逸仙堂',
        note: '同梯：財法一甲、財法一乙、國企一甲、國企一乙、第三人生大學班級',
        mine: true,
      },
      {
        time: '10:00 開始',
        title: '陽光心靈檢測＋職涯測評（國企系梯次）',
        place: 'F601、F607、F608、F609、F610',
        note: '同梯：AI 學程、財金系；兩項合計約 80 分鐘',
        mine: true,
      },
    ],
    notes: [
      '體檢在逸仙堂，國企一丙是 09:00–10:00，其他班級依分配表梯次入場。',
      '心靈檢測與職涯測評到電腦教室做，錯過原訂時間就到現場報到，視老師安排補測場次。',
      '當天活動 17:00 結束，務必 15:10 前抵達現場報到；沒完成的開學後另行通知補測。',
      '桃園校區當天另有新生入學輔導，這份流程是台北校區的。',
    ],
  },
]

/** 這筆學校行事曆事件涵蓋到、而且標題對得上的流程表。 */
export function orientationDaysFor(event: {
  title: string
  start: string
  end?: string
}): OrientationDay[] {
  const last = event.end ?? event.start
  return ORIENTATION_DAYS.filter(
    (day) =>
      day.date >= event.start &&
      day.date <= last &&
      day.match.some((keyword) => event.title.includes(keyword)),
  )
}
