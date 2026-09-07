import { useCallback, useState } from 'react'
import { CourseEditor } from './components/CourseEditor'
import { CourseTable } from './components/CourseTable'
import { Masthead } from './components/Masthead'
import { AcademicCalendar } from './components/AcademicCalendar'
import { SchoolCalendar } from './components/SchoolCalendar'
import { Settings } from './components/Settings'
import { TodayClasses } from './components/TodayClasses'
import { TodaySummary } from './components/TodaySummary'
import { UpNext } from './components/UpNext'
import { WeekSchedule } from './components/WeekSchedule'
import { todayISO } from './lib/dates'
import { enrolled, totalCredits, waitlisted } from './lib/schedule'
import { buildICS, downloadICS } from './lib/ics'
import { useAppState } from './state'
import { useReminders } from './useReminders'
import { useSync } from './useSync'
import { useTheme } from './useTheme'

type View = 'home' | 'almanac' | 'dates' | 'courses' | 'settings'

/** 分頁圖示。Lucide 的線條，1.5 粗細，直接內嵌免得為了五個圖示裝一個套件。 */
const TABS: { value: View; label: string; icon: string }[] = [
  { value: 'home', label: '首頁', icon: 'M3 10.5 12 3l9 7.5V21H3z' },
  { value: 'almanac', label: '行事曆', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { value: 'dates', label: '重要日期', icon: 'M4 6h16M4 12h16M4 18h10' },
  { value: 'courses', label: '編輯課表', icon: 'M3 3h18v18H3zM3 9h18M9 3v18' },
  {
    value: 'settings',
    label: '設定',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4 12H2M22 12h-2',
  },
]

function TabIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export default function App() {
  const { state, actions, saveError, loadSource, loadError } = useAppState()
  const [view, setView] = useState<View>('home')
  const [theme, setTheme] = useTheme()
  const today = todayISO()
  const taken = enrolled(state.courses)
  const pending = waitlisted(state.courses)
  const credits = totalCredits(taken)

  useReminders(state)

  const applyRemote = useCallback(
    (next: typeof state) => actions.setState(() => next),
    [actions],
  )
  const sync = useSync(state, applyRemote)

  return (
    <div className="app">
      <Masthead profile={state.profile} term={state.profile.term} today={today} />

      <nav className="nav">
        {/* 桌機把導覽變成左側欄，這兩塊只在那時候看得到（手機是底部 tab bar） */}
        <div className="nav-brand">
          <div>{state.profile.klass}</div>
          <div>
            {state.profile.term}　{state.profile.campus}
          </div>
        </div>

        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-current={view === tab.value}
            onClick={() => setView(tab.value)}
          >
            <TabIcon d={tab.icon} />
            {tab.label}
          </button>
        ))}

        <div className="nav-summary">
          這學期
          <b>
            {taken.length} 科 · {credits} 學分
          </b>
          {pending.length > 0 && `另有 ${pending.length} 門待遞補`}
        </div>
      </nav>

      {loadSource === 'recovered' && (
        <p className="notice" data-tone="warn">
          上次存的資料讀不回來（{loadError}），已改用預設課表。原始內容留在 localStorage 的
          mcu-schedule.state.v1.corrupt，還沒被刪掉。
        </p>
      )}

      {saveError && (
        <p className="notice" data-tone="warn">
          資料沒能存進瀏覽器：{saveError}。上一份存檔沒有被覆蓋。
        </p>
      )}

      {view === 'home' && (
        <>
          <TodaySummary courses={state.courses} today={today} />

          <UpNext
            items={state.items}
            courses={state.courses}
            schoolEvents={state.schoolEvents}
            today={today}
            defaultRemindDaysBefore={state.settings.defaultRemindDaysBefore}
            onAdd={actions.addItem}
            onToggle={actions.toggleItem}
            onDelete={actions.deleteItem}
            onOpenCalendar={() => setView('dates')}
          />

          <div className="export-cta">
            <p>
              瀏覽器通知只有在 App 開著時才會響。把課表和待辦匯出到手機的系統行事曆，提醒比較準。
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadICS(buildICS(state))}
            >
              匯出行事曆
            </button>
            <button type="button" className="btn" onClick={() => setView('settings')}>
              更多匯出選項
            </button>
          </div>

          <TodayClasses courses={state.courses} today={today} />
          <WeekSchedule courses={state.courses} today={today} campus={state.profile.campus} />
          <CourseTable courses={state.courses} />
        </>
      )}

      {view === 'almanac' && (
        <AcademicCalendar
          schoolEvents={state.schoolEvents}
          onAdd={actions.upsertSchoolEvent}
          onSemesterChange={actions.setSemester}
          semester={state.semester}
        />
      )}

      {view === 'dates' && (
        <SchoolCalendar
          schoolEvents={state.schoolEvents}
          semester={state.semester}
          today={today}
          onSave={actions.upsertSchoolEvent}
          onDelete={actions.deleteSchoolEvent}
          onSemesterChange={actions.setSemester}
        />
      )}

      {view === 'courses' && (
        <CourseEditor
          courses={state.courses}
          items={state.items}
          onSave={actions.upsertCourse}
          onDelete={actions.deleteCourse}
        />
      )}

      {view === 'settings' && (
        <Settings
          sync={sync}
          state={state}
          onChange={actions.setState}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
    </div>
  )
}
