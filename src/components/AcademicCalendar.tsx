import { useMemo, useState } from 'react'
import { ACADEMIC_CALENDAR, ACADEMIC_CALENDAR_SOURCE } from '../data/academicCalendar'
import type { CalendarPick } from '../data/academicCalendar'
import { SEMESTER_DEFAULT } from '../constants'
import { formatDateWithWeekday, todayISO } from '../lib/dates'
import type { AppState, SchoolEvent } from '../types'

const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六']

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

function initialZoom(): number {
  if (typeof window === 'undefined') return 1
  // 手機上整張表比螢幕寬得多，先縮到看得見整週再讓使用者自己放大
  return window.innerWidth <= 720 ? 0.6 : 1
}

interface Props {
  schoolEvents: SchoolEvent[]
  semester: AppState['semester']
  onAdd: (event: Omit<SchoolEvent, 'id'> & { id?: string }) => void
  onSemesterChange: (patch: Partial<AppState['semester']>) => void
}

export function AcademicCalendar({ schoolEvents, semester, onAdd, onSemesterChange }: Props) {
  const today = todayISO()
  const [semesterIndex, setSemesterIndex] = useState(() =>
    // 今天已經超過第 1 學期的最後一列就直接翻到第 2 學期
    ACADEMIC_CALENDAR[0].rows.some((r) => r.days.some((d) => d && d.iso >= today)) ? 0 : 1,
  )
  const [zoom, setZoom] = useState(initialZoom)
  const [showPicks, setShowPicks] = useState(false)

  const current = ACADEMIC_CALENDAR[semesterIndex]

  const alreadyAdded = useMemo(
    () => new Set(schoolEvents.map((e) => `${e.title}|${e.start}`)),
    [schoolEvents],
  )

  const upcomingPicks = useMemo(
    () =>
      current.rows
        .flatMap((r) => r.picks)
        .filter((p) => (p.end ?? p.start) >= today)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [current, today],
  )

  const usingOfficialSemester =
    semester.start === SEMESTER_DEFAULT.start && semester.end === SEMESTER_DEFAULT.end

  function addPick(pick: CalendarPick) {
    onAdd({
      title: pick.title,
      kind: guessKind(pick.title),
      start: pick.start,
      end: pick.end,
      note: '來自學校行事曆',
    })
  }

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10))

  return (
    <section className="section">
      <div className="section-head">
        <h2>行事曆</h2>
        <span className="section-note">{ACADEMIC_CALENDAR_SOURCE}</span>
      </div>

      <div className="almanac-bar">
        <div className="chip-row">
          {ACADEMIC_CALENDAR.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className="period-chip almanac-tab"
              aria-pressed={i === semesterIndex}
              onClick={() => setSemesterIndex(i)}
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="zoom-controls" role="group" aria-label="縮放">
          <button
            type="button"
            className="btn"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="縮小"
          >
            －
          </button>
          <span className="zoom-value mono" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="放大"
          >
            ＋
          </button>
          <button type="button" className="btn" onClick={() => setZoom(initialZoom())}>
            重設
          </button>
        </div>
      </div>

      <p className="section-note almanac-hint">
        兩指也可以直接縮放。今天的日期會標成深色。
      </p>

      <div className="scroll-x almanac-viewport">
        {/* zoom 會重新排版，比 transform: scale 好捲動 */}
        <div style={{ zoom }}>
          <table className="almanac">
            <thead>
              <tr>
                <th className="almanac-narrow">年</th>
                <th className="almanac-narrow">月</th>
                <th className="almanac-week">週次</th>
                {WEEK_HEAD.map((w) => (
                  <th key={w} className="almanac-day">
                    {w}
                  </th>
                ))}
                <th>全校重大活動舉辦事項</th>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="almanac-narrow almanac-vertical">{row.year ?? ''}</td>
                  <td className="almanac-narrow almanac-vertical">{row.month ?? ''}</td>
                  <td className="almanac-week">{row.week}</td>
                  {row.days.map((day, di) => (
                    <td
                      key={di}
                      className="almanac-day mono"
                      data-today={day?.iso === today}
                      data-weekend={di === 0 || di === 6}
                    >
                      {day?.d ?? ''}
                    </td>
                  ))}
                  <td className="almanac-events">{row.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="setting-block panel almanac-actions">
        <h3>學期起訖</h3>
        <p className="setting-desc">
          {usingOfficialSemester ? (
            <>
              目前是 <strong>{semester.start}</strong> 到 <strong>{semester.end}</strong>，
              取自這份官方行事曆（9/7 開學正式上課，1/4–1/8 期末學習評量週）。匯出的課程會重複到這一天。
            </>
          ) : (
            <>
              目前是 <strong>{semester.start}</strong> 到 <strong>{semester.end}</strong>，你自己改過。
            </>
          )}
        </p>
        {!usingOfficialSemester && (
          <button
            type="button"
            className="btn"
            onClick={() => onSemesterChange({ ...SEMESTER_DEFAULT })}
          >
            改回官方日期（{SEMESTER_DEFAULT.start} 到 {SEMESTER_DEFAULT.end}）
          </button>
        )}
      </div>

      <div className="setting-block panel">
        <h3>從行事曆加入重要日期</h3>
        <p className="setting-desc">
          加進去的會出現在首頁「接下來」倒數，也會一起匯出到系統行事曆。
          只列得出確切日期的事項，跨月或寫法特殊的請自己到「重要日期」新增。
        </p>
        <button type="button" className="btn" onClick={() => setShowPicks((v) => !v)}>
          {showPicks ? '收起' : `展開（還有 ${upcomingPicks.length} 筆）`}
        </button>

        {showPicks && (
          <ul className="pick-list">
            {upcomingPicks.map((pick, i) => {
              const added = alreadyAdded.has(`${pick.title}|${pick.start}`)
              return (
                <li key={`${pick.start}-${i}`} className="pick-row">
                  <span className="pick-date mono">
                    {formatDateWithWeekday(pick.start)}
                    {pick.end && ` 到 ${formatDateWithWeekday(pick.end)}`}
                  </span>
                  <span className="pick-title">{pick.title}</span>
                  <button
                    type="button"
                    className="btn"
                    disabled={added}
                    onClick={() => addPick(pick)}
                  >
                    {added ? '已加入' : '＋ 加入'}
                  </button>
                </li>
              )
            })}
            {upcomingPicks.length === 0 && <li className="empty">這個學期已經沒有未來的事項了。</li>}
          </ul>
        )}
      </div>
    </section>
  )
}

/** 從標題猜類型，猜不到就當「其他」。使用者加進去之後還是可以自己改。 */
function guessKind(title: string): SchoolEvent['kind'] {
  if (/評量|考試|考|測驗/.test(title)) return 'exam'
  if (/放假|休假|補假|寒假|暑假|紀念日|節$|連假/.test(title)) return 'holiday'
  if (/開學|註冊|上課|選課|結束|開始/.test(title)) return 'term'
  return 'other'
}
