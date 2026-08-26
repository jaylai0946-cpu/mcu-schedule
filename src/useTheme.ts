import { useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const THEME_KEY = 'mcu-schedule.theme'

function readTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme(): [ThemeChoice, (next: ThemeChoice) => void] {
  const [theme, setTheme] = useState<ThemeChoice>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    // 'system' 不設 data-theme，讓 prefers-color-scheme 自己決定
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)

    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, theme)
    } catch {
      // 存不了就算了，至少這次還是換得過去
    }
  }, [theme])

  return [theme, setTheme]
}
