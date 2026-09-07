import { COURSE_CATEGORY_NAMES, WEEKDAY_NAMES } from '../constants'
import { periodSpanTime } from '../lib/dates'
import { enrolled, splitContiguous, totalCredits, waitlisted } from '../lib/schedule'
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
  const taken = enrolled(courses)
  const pending = waitlisted(courses)

  return (
    <section className="section">
      <div className="section-head">
        <h2>修課清單</h2>
        <span className="section-note">
          共 {taken.length} 門
          {pending.length > 0 && `，另有 ${pending.length} 門待遞補`}
        </span>
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
            {[...taken, ...pending].map((course) =>
              // 時間還沒確定的課沒有時段，也要有一列，不然整門課會從清單上消失
              (course.sessions.length > 0 ? course.sessions : [null]).map((s, i) => (
                <tr key={`${course.id}-${i}`} data-waitlisted={course.waitlisted === true}>
                  <td>
                    <div className="course-name-cell">
                      <span className="course-bar" data-category={course.category} />
                      <span className="course-name">
                        {i === 0 ? course.name : ''}
                        {s?.label ? `（${s.label}）` : ''}
                        {i === 0 && course.category && (
                          <span className="tag tag-category" data-category={course.category}>
                            {COURSE_CATEGORY_NAMES[course.category]}
                          </span>
                        )}
                        {i === 0 && course.waitlisted && <span className="tag tag-wait">待遞補</span>}
                        {i === 0 && course.note && <span className="course-note">{course.note}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="when">{i === 0 ? course.code : ''}</td>
                  <td className="when" style={{ whiteSpace: 'pre-line' }}>
                    {s ? sessionWhen(s) : course.timeNote ?? '時間未定'}
                  </td>
                  <td>{s ? s.room || '未定' : '—'}</td>
                  <td>{s?.teacher ?? course.teacher}</td>
                  <td className="num">{i === 0 ? course.credits : ''}</td>
                </tr>
              )),
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>學分合計</td>
              <td className="num">{totalCredits(taken)}</td>
            </tr>
            {pending.length > 0 && (
              <tr data-waitlisted="true">
                <td colSpan={5}>待遞補（還沒算進上面）</td>
                <td className="num">{totalCredits(pending)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </section>
  )
}
