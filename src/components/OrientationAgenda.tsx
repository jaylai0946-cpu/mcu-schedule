import { useState } from 'react'
import { ORIENTATION_SOURCE, type AgendaTable, type OrientationDay } from '../data/orientation'

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

function initialZoom(): number {
  if (typeof window === 'undefined') return 1
  // 原表五欄，手機上比螢幕寬得多，先縮到看得見整張再讓使用者自己放大
  return window.innerWidth <= 720 ? 0.6 : 1
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10))

/**
 * 新生入學輔導的官方表格，照原表畫。預設收起來，
 * 不然「接下來」第一列會爆掉一整螢幕。
 * 縮放和左右滑的做法跟週課表、官方行事曆同一套。
 */
export function OrientationAgenda({ day }: { day: OrientationDay }) {
  const [zoom, setZoom] = useState(initialZoom)

  return (
    <details className="agenda">
      <summary>{day.summary}</summary>

      <div className="agenda-bar">
        <div className="zoom-controls" role="group" aria-label="表格縮放">
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
        <span className="agenda-hint">可以左右滑，兩指也能直接縮放</span>
      </div>

      {day.tables.map((table) => (
        <div key={table.caption ?? table.columns.join()} className="scroll-x agenda-viewport">
          {/* zoom 會重新排版，比 transform: scale 好捲動 */}
          <div style={{ zoom }}>
            <AgendaTableView table={table} />
          </div>
        </div>
      ))}

      <p className="agenda-source">資料來源：{ORIENTATION_SOURCE}</p>
    </details>
  )
}

function AgendaTableView({ table }: { table: AgendaTable }) {
  return (
    <table className="agenda-table" style={{ minWidth: table.minWidth }}>
      {table.caption && <caption>{table.caption}</caption>}
      <thead>
        <tr>
          {table.columns.map((col) => (
            <th key={col} scope="col" data-col={col}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row.join('|')}>
            {row.map((cell, i) => (
              <td key={table.columns[i]} data-col={table.columns[i]}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
