import { useCallback, useEffect, useState } from 'react'

export type WeekViewMode = 'grid' | 'list'

const KEY = 'mcu-schedule.weekview'

export const WEEK_ZOOM_MIN = 0.4
export const WEEK_ZOOM_MAX = 1.4
const WEEK_ZOOM_STEP = 0.1

/** 手機上格子課表有五欄，塞不進 390px，先縮到看得見整週。 */
function defaultZoom(): number {
  if (typeof window === 'undefined') return 1
  return window.innerWidth <= 720 ? 0.6 : 1
}

export function clamp(zoom: number): number {
  return Math.min(WEEK_ZOOM_MAX, Math.max(WEEK_ZOOM_MIN, Math.round(zoom * 10) / 10))
}

interface Stored {
  mode: WeekViewMode
  zoom: number
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        mode: parsed?.mode === 'list' ? 'list' : 'grid',
        zoom: clamp(typeof parsed?.zoom === 'number' ? parsed.zoom : defaultZoom()),
      }
    }
  } catch {
    // 讀不到就用預設，不要因為這個炸掉
  }
  return { mode: 'grid', zoom: defaultZoom() }
}

export function useWeekView() {
  const [{ mode, zoom }, setStored] = useState<Stored>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, zoom }))
    } catch {
      // 存不了就只是這次的選擇不會記住，不影響顯示
    }
  }, [mode, zoom])

  const setMode = useCallback((next: WeekViewMode) => {
    setStored((prev) => ({ ...prev, mode: next }))
  }, [])

  const zoomBy = useCallback((delta: number) => {
    setStored((prev) => ({ ...prev, zoom: clamp(prev.zoom + delta) }))
  }, [])

  const zoomIn = useCallback(() => zoomBy(WEEK_ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(-WEEK_ZOOM_STEP), [zoomBy])
  const resetZoom = useCallback(() => setStored((prev) => ({ ...prev, zoom: defaultZoom() })), [])

  return { mode, zoom, setMode, zoomIn, zoomOut, resetZoom }
}
