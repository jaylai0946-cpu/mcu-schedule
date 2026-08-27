import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadState, saveState } from './lib/storage'
import type { AppState, Course, SchoolEvent, TodoItem } from './types'

export type NewTodoInput = Omit<TodoItem, 'id' | 'done' | 'createdAt'>
export type NewSchoolEventInput = Omit<SchoolEvent, 'id'>

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${performance.now().toString(36)}`
}

export function useAppState() {
  const [initial] = useState(loadState)
  const [state, setState] = useState<AppState>(initial.state)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const result = saveState(state)
    setSaveError(result.ok ? null : result.error)
  }, [state])

  const addItem = useCallback((input: NewTodoInput) => {
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...input, id: newId(), done: false, createdAt: new Date().toISOString() },
      ],
    }))
  }, [])

  const toggleItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    }))
  }, [])

  const deleteItem = useCallback((id: string) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }))
  }, [])

  const upsertCourse = useCallback((course: Course) => {
    setState((prev) => {
      const exists = prev.courses.some((c) => c.id === course.id)
      return {
        ...prev,
        courses: exists
          ? prev.courses.map((c) => (c.id === course.id ? course : c))
          : [...prev.courses, course],
      }
    })
  }, [])

  /** 刪課程時不刪關聯的待辦，只把 courseId 清掉。 */
  const deleteCourse = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      items: prev.items.map((it) => (it.courseId === id ? { ...it, courseId: undefined } : it)),
    }))
  }, [])

  /** 新增或更新一筆學校行事曆。沒有 id 就是新增。 */
  const upsertSchoolEvent = useCallback((event: SchoolEvent | (NewSchoolEventInput & { id?: string })) => {
    setState((prev) => {
      const id = event.id ?? newId()
      const next: SchoolEvent = { ...event, id }
      const exists = prev.schoolEvents.some((e) => e.id === id)
      return {
        ...prev,
        schoolEvents: exists
          ? prev.schoolEvents.map((e) => (e.id === id ? next : e))
          : [...prev.schoolEvents, next],
      }
    })
  }, [])

  const deleteSchoolEvent = useCallback((id: string) => {
    setState((prev) => ({ ...prev, schoolEvents: prev.schoolEvents.filter((e) => e.id !== id) }))
  }, [])

  const setSemester = useCallback((patch: Partial<AppState['semester']>) => {
    setState((prev) => ({ ...prev, semester: { ...prev.semester, ...patch } }))
  }, [])

  const actions = useMemo(
    () => ({
      addItem,
      toggleItem,
      deleteItem,
      upsertCourse,
      deleteCourse,
      upsertSchoolEvent,
      deleteSchoolEvent,
      setSemester,
      setState,
    }),
    [
      addItem,
      toggleItem,
      deleteItem,
      upsertCourse,
      deleteCourse,
      upsertSchoolEvent,
      deleteSchoolEvent,
      setSemester,
    ],
  )

  return { state, actions, saveError, loadSource: initial.source, loadError: initial.error }
}

export type AppActions = ReturnType<typeof useAppState>['actions']
export type { TodoItem }
