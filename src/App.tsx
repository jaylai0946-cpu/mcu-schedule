import { useState } from 'react'
import { CourseEditor } from './components/CourseEditor'
import { CourseTable } from './components/CourseTable'
import { Masthead } from './components/Masthead'
import { AcademicCalendar } from './components/AcademicCalendar'
import { SchoolCalendar } from './components/SchoolCalendar'
import { Settings } from './components/Settings'
import { TodayClasses } from './components/TodayClasses'
import { UpNext } from './components/UpNext'
import { WeekSchedule } from './components/WeekSchedule'
import { todayISO } from './lib/dates'
import { buildICS, downloadICS } from './lib/ics'
import { useAppState } from './state'
import { useReminders } from './useReminders'
import { useTheme } from './useTheme'

type View = 'home' | 'almanac' | 'dates' | 'courses' | 'settings'

const TABS: { value: View; label: string }[] = [
  { value: 'home', label: '首頁' },
  { value: 'almanac', label: '行事曆' },
  { value: 'dates', label: '重要日期' },
  { value: 'courses', label: '編輯課表' },
  { value: 'settings', label: '設定' },
]

export default function App() {
  const { state, actions, saveError, loadSource, loadError } = useAppState()
  const [view, setView] = useState<View>('home')
  const [theme, setTheme] = useTheme()
  const today = todayISO()

  useReminders(state)

  return (
    <div className="app">
      <Masthead profile={state.profile} term={state.profile.term} today={today} />

      <nav className="nav">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-current={view === tab.value}
            onClick={() => setView(tab.value)}
          >
            {tab.label}
          </button>
        ))}
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
          state={state}
          onChange={actions.setState}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
    </div>
  )
}
