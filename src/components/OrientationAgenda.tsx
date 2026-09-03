import { ORIENTATION_SOURCE, type AgendaTable, type OrientationDay } from '../data/orientation'

/**
 * 新生入學輔導的官方表格，照原表畫。預設收起來，
 * 不然「接下來」第一列會爆掉一整螢幕。窄螢幕就左右捲。
 */
export function OrientationAgenda({ day }: { day: OrientationDay }) {
  return (
    <details className="agenda">
      <summary>{day.summary}</summary>

      {day.tables.map((table) => (
        <AgendaTableView key={table.caption ?? table.columns.join()} table={table} />
      ))}

      <p className="agenda-source">資料來源：{ORIENTATION_SOURCE}</p>
    </details>
  )
}

function AgendaTableView({ table }: { table: AgendaTable }) {
  return (
    <div className="scroll-x agenda-scroll">
      <table className="agenda-table">
        {table.caption && <caption>{table.caption}</caption>}
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th key={col} scope="col">
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
    </div>
  )
}
