import { ORIENTATION_SOURCE, type OrientationDay } from '../data/orientation'

/**
 * 新生入學輔導當天的流程表。預設收起來，不然「接下來」第一列會爆掉一整螢幕。
 */
export function OrientationAgenda({ day }: { day: OrientationDay }) {
  return (
    <details className="agenda">
      <summary>{day.summary}</summary>

      <ol className="agenda-list">
        {day.slots.map((slot) => (
          <li key={`${slot.time} ${slot.title}`} className="agenda-row" data-mine={slot.mine === true}>
            <span className="agenda-time mono">{slot.time}</span>
            <div className="agenda-main">
              <div className="agenda-title">
                {slot.title}
                {slot.mine && <span className="tag agenda-mine">我們班</span>}
              </div>
              {(slot.place || slot.host || slot.note) && (
                <div className="agenda-meta">
                  {slot.place && <span className="mono">{slot.place}</span>}
                  {slot.host && <span>{slot.host}</span>}
                  {slot.note && <span>{slot.note}</span>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {day.notes.length > 0 && (
        <ul className="agenda-notes">
          {day.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <p className="agenda-source">資料來源：{ORIENTATION_SOURCE}</p>
    </details>
  )
}
