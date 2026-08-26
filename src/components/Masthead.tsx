import { formatDateWithWeekday } from '../lib/dates'
import type { AppState } from '../types'

export function Masthead({ profile, term, today }: { profile: AppState['profile']; term: string; today: string }) {
  return (
    <header className="masthead">
      <h1>{profile.klass}</h1>
      <div className="masthead-meta">
        <span>{term}</span>
        <span>{profile.campus}</span>
        <span className="masthead-today mono">{formatDateWithWeekday(today)}</span>
      </div>
    </header>
  )
}
