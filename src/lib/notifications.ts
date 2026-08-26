import { countdownLabel, daysUntil, todayISO } from './dates'
import type { AppState, TodoItem } from '../types'

export interface NotificationCapability {
  /** 這個瀏覽器有沒有 Notification API */
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  /** 是不是從主畫面開啟的（PWA 模式） */
  standalone: boolean
  ios: boolean
  /** iOS 一定要先「加入主畫面」才發得出通知 */
  needsInstallOnIOS: boolean
  /** 背景排程。支援度很有限，偵測不到就老實降級 */
  periodicSync: boolean
}

export function detectCapability(): NotificationCapability {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true)

  return {
    supported,
    permission: supported ? Notification.permission : 'unsupported',
    standalone,
    ios,
    needsInstallOnIOS: ios && !standalone,
    periodicSync:
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PeriodicSyncManager' in window,
  }
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}

/** 通知標題，例如：「經濟學第一次期中考」明天 09:10 */
export function reminderText(item: TodoItem, today: string): string {
  const days = daysUntil(item.date, new Date(`${today}T00:00:00Z`))
  return `「${item.title}」${countdownLabel(days)}${item.time ? ` ${item.time}` : ''}`
}

/** 沒填時間的待辦，提醒時刻預設早上八點。 */
const DEFAULT_REMIND_TIME = '08:00'

export interface DueReminder {
  item: TodoItem
  /** 今天要在幾點幾分提醒 */
  at: string
}

/**
 * 挑出「今天該提醒」的待辦：到期日往前推 remindDaysBefore 天剛好是今天。
 * 已完成的不提醒。
 */
export function remindersForToday(state: AppState, today = todayISO()): DueReminder[] {
  return state.items
    .filter((item) => !item.done)
    .filter((item) => {
      const before = item.remindDaysBefore ?? state.settings.defaultRemindDaysBefore
      return daysUntil(item.date, new Date(`${today}T00:00:00Z`)) === before
    })
    .map((item) => ({ item, at: item.time ?? DEFAULT_REMIND_TIME }))
}

export function showNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // 裝成 PWA 時走 service worker，通知比較不會被系統當成分頁通知收走
  navigator.serviceWorker?.getRegistration().then((registration) => {
    if (registration) {
      void registration.showNotification(title, { body, tag: title, badge: undefined })
    } else {
      new Notification(title, { body, tag: title })
    }
  })
}
