import { WEEKDAY_NAMES } from '../constants'
import { periodSpanTime } from '../lib/dates'
import { splitContiguous, totalCredits } from '../lib/schedule'
import type { Course, Session } from '../types'

function sessionWhen(s: Session): string {
  return splitContiguous(s.ps)
    .map((run) => {
      const { start, end } = periodSpanTime(run)
      const names = run.join(',')
      return `${WEEKDAY_NAMES[s.d]} ${names} 節　${start}–${end}`
    })
    .join('\n')
}

export function CourseTable({ courses }: { courses: Course[] }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>修課清單</h2>
        <span className="section-note">共 {courses.length} 門</span>
      </div>

      <div className="scroll-x panel">
        <table className="course-table">
          <thead>
            <tr>
              <th>科目</th>
              <th>課號</th>
              <th>上課時間</th>
              <th>教室</th>
              <th>教師</th>
              <th className="num">學分</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) =>
              course.sessions.map((s, i) => (
                <tr key={`${course.id}-${i}`}>
                  <td>
                    <div className="course-name-cell">
                      <span className="course-bar" />
                      <span className="course-name">
                        {i === 0 ? course.name : ''}
                        {s.label ? `（${s.label}）` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="when">{i === 0 ? course.code : ''}</td>
                  <td className="when" style={{ whiteSpace: 'pre-line' }}>
                    {sessionWhen(s)}
                  </td>
                  <td>{s.room}</td>
                  <td>{s.teacher ?? course.teacher}</td>
                  <td className="num">{i === 0 ? course.credits : ''}</td>
                </tr>
              )),
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>學分合計</td>
              <td className="num">{totalCredits(courses)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
