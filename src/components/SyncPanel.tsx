import { useState } from 'react'
import { describeState, generateKey, validateEndpoint, validateKey } from '../lib/sync'
import type { useSync } from '../useSync'
import type { AppState } from '../types'

interface Props {
  sync: ReturnType<typeof useSync>
  state: AppState
}

function statusText(status: Props['sync']['status']): string {
  switch (status.kind) {
    case 'off':
      return '未啟用'
    case 'busy':
      return '同步中…'
    case 'idle':
      return status.at ? `已同步（雲端版本 ${status.at.slice(0, 16).replace('T', ' ')} UTC）` : '已啟用'
    case 'error':
      return `同步失敗：${status.message}`
    case 'conflict':
      return '兩邊都有改動，需要你決定'
  }
}

export function SyncPanel({ sync, state }: Props) {
  const { config, status } = sync
  const [endpoint, setEndpoint] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [revealKey, setRevealKey] = useState(false)

  function enable() {
    const endpointError = validateEndpoint(endpoint.trim())
    if (endpointError) return setError(endpointError)
    const keyError = validateKey(key.trim())
    if (keyError) return setError(keyError)
    setError(null)
    sync.enable(endpoint.trim().replace(/\/+$/, ''), key.trim())
  }

  return (
    <div className="setting-block panel">
      <h3>手機與電腦同步</h3>

      {!config ? (
        <>
          <p className="setting-desc">
            要先自己部署一個同步伺服器（`worker/` 資料夾裡有現成的 Cloudflare Worker，
            README 有步驟）。部署完把網址填進來，兩台裝置填<strong>同一組密鑰</strong>就會互相同步。
          </p>
          <p className="notice" data-tone="warn">
            這組密鑰就是憑證，沒有帳號密碼。拿到密鑰的人就拿得到你的資料，不要貼到公開的地方。
          </p>

          <div className="form">
            <div className="field field-wide">
              <label htmlFor="sync-endpoint">同步伺服器網址</label>
              <input
                id="sync-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://mcu-schedule-sync.你的帳號.workers.dev"
                autoComplete="off"
              />
            </div>

            <div className="field field-wide">
              <label htmlFor="sync-key">密鑰（32 個小寫英數字）</label>
              <input
                id="sync-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="第一台按「產生新密鑰」，第二台貼上同一組"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="form-actions field-wide">
              <button type="button" className="btn btn-primary" onClick={enable}>
                啟用同步
              </button>
              <button type="button" className="btn" onClick={() => setKey(generateKey())}>
                產生新密鑰
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="setting-desc">
            狀態：<strong>{statusText(status)}</strong>
            <br />
            伺服器 <span className="mono">{config.endpoint}</span>
            {config.dirty && status.kind !== 'busy' && '　有還沒推上去的改動'}
          </p>

          {status.kind === 'error' && (
            <p className="notice" data-tone="warn">
              {status.message}。本機資料沒有受影響，網路好了再按「立即同步」。
            </p>
          )}

          {status.kind === 'conflict' && (
            <div className="confirm-box" role="alert">
              <p>
                <strong>兩邊都改過，我不會自己選。</strong>
                <br />
                這台：{describeState(state)}
                <br />
                雲端：{describeState(status.remote.state)}
                （{status.remote.updatedAt.slice(0, 16).replace('T', ' ')} UTC）
              </p>
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={() => void sync.resolveWithLocal()}>
                  用這台的，覆蓋雲端
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => sync.resolveWithRemote(status.remote)}
                >
                  用雲端的，覆蓋這台
                </button>
              </div>
              <p className="section-note">
                選之前可以先按上面的「匯出 JSON 備份」留一份，這樣兩邊的資料都不會真的不見。
              </p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void sync.syncNow()}
              disabled={status.kind === 'busy'}
            >
              立即同步
            </button>
            <button type="button" className="btn" onClick={() => setRevealKey((v) => !v)}>
              {revealKey ? '隱藏密鑰' : '顯示密鑰'}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void sync.disable(false)}>
              停用同步
            </button>
          </div>

          {revealKey && (
            <>
              <p className="setting-desc" style={{ marginTop: 12 }}>
                在另一台裝置填一樣的網址和這組密鑰：
              </p>
              <p className="sync-key mono">{config.key}</p>
            </>
          )}
        </>
      )}
    </div>
  )
}
