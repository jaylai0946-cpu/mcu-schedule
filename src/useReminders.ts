import { useEffect, useRef } from 'react'
import { nowTime, timeToMinutes, todayISO } from './lib/dates'
import { remindersForToday, showNotification } from './lib/notifications'
import type { AppState } from './types'

/**
 * 頁面開著的時候，每分鐘檢查一次今天該提醒的待辦。
 * 這是「App 有開才會響」的降級做法——真正可靠的提醒請匯出到系統行事曆。
 */
export function useReminders(state: AppState) {
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!state.settings.notificationsEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    function check() {
      const today = todayISO()
      const minutesNow = timeToMinutes(nowTime())

      for (const { item, at } of remindersForToday(state, today)) {
        const key = `${today}-${item.id}`
        if (firedRef.current.has(key)) continue
        if (timeToMinutes(at) > minutesNow) continue

        firedRef.current.add(key)
        showNotification(
          `「${item.title}」${item.time ? `今天 ${item.time}` : '今天'}`,
          item.note ?? '點一下打開課表',
        )
      }
    }

    check()
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, [state])
}
