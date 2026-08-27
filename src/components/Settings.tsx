import { useRef, useState } from 'react'
import { SEMESTER_PLACEHOLDER } from '../constants'
import { isValidDateString } from '../lib/dates'
import { buildICS, downloadICS } from '../lib/ics'
import { detectCapability, requestPermission } from '../lib/notifications'
import { exportJSON, importJSON } from '../lib/storage'
import type { ThemeChoice } from '../useTheme'
import type { AppState } from '../types'

interface Props {
  state: AppState
  onChange: (updater: (prev: AppState) => AppState) => void
  theme: ThemeChoice
  onThemeChange: (next: ThemeChoice) => void
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: '跟隨系統' },
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
]

export function Settings({ state, onChange, theme, onThemeChange }: Props) {
  const [capability, setCapability] = useState(detectCapability)
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const semesterUnconfirmed =
    state.semester.start === SEMESTER_PLACEHOLDER.start &&
    state.semester.end === SEMESTER_PLACEHOLDER.end

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      onChange((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: false } }))
      return
    }
    const permission = await requestPermission()
    setCapability(detectCapability())
    onChange((prev) => ({
      ...prev,
      settings: { ...prev.settings, notificationsEnabled: permission === 'granted' },
    }))
  }

  function download(kind: 'all' | 'items') {
    downloadICS(
      buildICS(state, { includeCourses: kind === 'all' }),
      kind === 'all' ? 'mcu-schedule.ics' : 'mcu-todo.ics',
    )
  }

  function downloadBackup() {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mcu-schedule-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleImport(file: File) {
    const result = importJSON(await file.text())
    if (!result.ok) {
      setImportMessage({ ok: false, text: `匯入失敗，資料沒有被動到：${result.error}` })
      return
    }
    onChange(() => result.state)
    setImportMessage({
      ok: true,
      text: `已還原：${result.state.courses.length} 門課、${result.state.items.length} 筆待辦。`,
    })
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>設定</h2>
      </div>

      {/* 行事曆匯出放最前面：這是最可靠的提醒方式 */}
      <div className="setting-block panel">
        <h3>匯出到系統行事曆</h3>
        <p className="setting-desc">
          瀏覽器通知本來就不可靠（關掉分頁、手機休眠都可能不會響）。
          <strong>把行事曆匯出到手機的系統行事曆，提醒才會準。</strong>
          下載後在手機上點開檔案，選「加入行事曆」就好。學校行事曆的日期會以全天事件一起匯出。
        </p>
        {semesterUnconfirmed && (
          <p className="notice">
            學期起訖還是暫定值。現在匯出的話，課程會重複到 {state.semester.end} 為止——
            先在下面把日期改成銘傳行事曆上的正確日期再匯出。
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => download('all')}>
            匯出全部（課程＋待辦＋學校日期）
          </button>
          <button type="button" className="btn" onClick={() => download('items')}>
            只匯出待辦與學校日期
          </button>
        </div>
      </div>

      <div className="setting-block panel">
        <h3>學期起訖</h3>
        <p className="setting-desc">
          決定匯出的課程要每週重複到哪一天。查銘傳行事曆的開學日與期末最後上課日填進來。
        </p>
        <div className="form">
          <div className="field">
            <label htmlFor="semester-start">開學日</label>
            <input
              id="semester-start"
              type="date"
              value={state.semester.start}
              onChange={(e) => {
                const value = e.target.value
                if (!isValidDateString(value)) return
                onChange((prev) => ({ ...prev, semester: { ...prev.semester, start: value } }))
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="semester-end">最後上課日</label>
            <input
              id="semester-end"
              type="date"
              value={state.semester.end}
              onChange={(e) => {
                const value = e.target.value
                if (!isValidDateString(value)) return
                onChange((prev) => ({ ...prev, semester: { ...prev.semester, end: value } }))
              }}
            />
          </div>
        </div>
      </div>

      <div className="setting-block panel">
        <h3>提醒通知</h3>

        <label className="switch-row">
          <input
            type="checkbox"
            checked={state.settings.notificationsEnabled}
            onChange={(e) => void toggleNotifications(e.target.checked)}
            disabled={!capability.supported}
          />
          <span>開啟瀏覽器通知</span>
        </label>

        <div className="field" style={{ maxWidth: 220, marginTop: 12 }}>
          <label htmlFor="default-remind">預設提前幾天提醒</label>
          <input
            id="default-remind"
            type="number"
            min="0"
            max="30"
            value={state.settings.defaultRemindDaysBefore}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  defaultRemindDaysBefore: Math.max(0, Number(e.target.value) || 0),
                },
              }))
            }
          />
        </div>

        <h4 className="limits-head">這個功能做得到什麼、做不到什麼</h4>
        <ul className="limits">
          {!capability.supported && <li>這個瀏覽器不支援 Notification API，通知完全不會運作。</li>}
          {capability.needsInstallOnIOS && (
            <li>
              <strong>你在 iPhone／iPad 上，而且還沒把這個 App 加到主畫面。</strong>
              iOS 規定只有加入主畫面後開啟才發得出通知。請按分享鍵選「加入主畫面」，
              再從主畫面的圖示打開，然後回來重新開啟通知。
            </li>
          )}
          <li>
            提醒只有在<strong>這個 App 有開著</strong>的時候才會排程與觸發。
            關掉分頁之後不會響。
          </li>
          <li>
            {capability.periodicSync
              ? '這個瀏覽器有 Periodic Background Sync，但實際會不會在背景執行由系統決定，不保證。'
              : '這個瀏覽器沒有 Periodic Background Sync，所以沒有任何背景排程——已經降級成「開著才提醒」，不會假裝排到了。'}
          </li>
          <li>
            目前通知權限狀態：<code>{capability.permission}</code>
          </li>
          <li>要真正靠得住，請用上面的行事曆匯出。</li>
        </ul>
      </div>

      <div className="setting-block panel">
        <h3>外觀</h3>
        <div className="chip-row">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              className="period-chip"
              style={{ minWidth: 'auto', padding: '0 14px', fontFamily: 'inherit' }}
              aria-pressed={theme === t.value}
              onClick={() => onThemeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-block panel">
        <h3>資料備份</h3>
        <p className="setting-desc">
          資料只存在這台裝置的瀏覽器裡。清除瀏覽器資料就會不見，
          換手機或重灌前記得先匯出一份 JSON。
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={downloadBackup}>
            匯出 JSON 備份
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            從 JSON 還原
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ''
            }}
          />
        </div>
        {importMessage && (
          <p className="notice" data-tone={importMessage.ok ? undefined : 'warn'}>
            {importMessage.text}
          </p>
        )}
      </div>
    </section>
  )
}
