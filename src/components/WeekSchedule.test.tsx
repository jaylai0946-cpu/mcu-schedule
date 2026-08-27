import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'

beforeEach(() => localStorage.clear())

function weekSection(): HTMLElement {
  return screen.getByRole('heading', { name: '週課表' }).closest('.section') as HTMLElement
}

describe('手機上的清單／格子切換', () => {
  it('預設是格子', () => {
    render(<App />)
    expect(weekSection()).toHaveAttribute('data-week-view', 'grid')
    expect(screen.getByRole('button', { name: '格子' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('切到清單會改變模式，切回來也可以', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '清單' }))
    expect(weekSection()).toHaveAttribute('data-week-view', 'list')

    fireEvent.click(screen.getByRole('button', { name: '格子' }))
    expect(weekSection()).toHaveAttribute('data-week-view', 'grid')
  })

  it('選過的模式會記住，重新開啟還在', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '清單' }))
    unmount()

    render(<App />)
    expect(weekSection()).toHaveAttribute('data-week-view', 'list')
  })

  it('兩種模式的內容都在，切換只是顯示哪一個', () => {
    render(<App />)
    const section = weekSection()
    // 格子與清單都畫出來，靠 CSS 決定顯示哪個，切換才不會有閃動
    expect(section.querySelector('.week-grid-wrap')).toBeInTheDocument()
    expect(section.querySelector('.week-list-wrap')).toBeInTheDocument()
  })
})

describe('格子課表的縮放', () => {
  it('放大縮小會改變百分比與實際的 zoom', () => {
    render(<App />)
    const section = weekSection()
    const grid = section.querySelector('.week-grid') as HTMLElement
    const before = Number(within(section).getByText(/%$/).textContent!.replace('%', ''))

    fireEvent.click(screen.getByRole('button', { name: '課表放大' }))
    expect(Number(within(weekSection()).getByText(/%$/).textContent!.replace('%', ''))).toBe(
      before + 10,
    )
    expect((weekSection().querySelector('.week-grid') as HTMLElement).style.zoom).toBe(
      String((before + 10) / 100),
    )
    expect(grid).toBeInTheDocument()
  })

  it('重設會回到預設倍率', () => {
    render(<App />)
    const before = within(weekSection()).getByText(/%$/).textContent
    fireEvent.click(screen.getByRole('button', { name: '課表放大' }))
    fireEvent.click(within(weekSection()).getByRole('button', { name: '重設' }))
    expect(within(weekSection()).getByText(/%$/).textContent).toBe(before)
  })

  it('縮到最小、放到最大時按鈕會停用', () => {
    render(<App />)
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: '課表縮小' }))
    expect(screen.getByRole('button', { name: '課表縮小' })).toBeDisabled()
    expect(within(weekSection()).getByText('40%')).toBeInTheDocument()

    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: '課表放大' }))
    expect(screen.getByRole('button', { name: '課表放大' })).toBeDisabled()
    expect(within(weekSection()).getByText('140%')).toBeInTheDocument()
  })

  it('清單模式下不顯示縮放控制', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '清單' }))
    expect(screen.queryByRole('button', { name: '課表放大' })).not.toBeInTheDocument()
  })

  it('縮放倍率也會記住', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '課表縮小' }))
    const after = within(weekSection()).getByText(/%$/).textContent
    unmount()

    render(<App />)
    expect(within(weekSection()).getByText(/%$/).textContent).toBe(after)
  })
})
