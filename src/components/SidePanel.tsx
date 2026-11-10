import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { PanelHost } from './panelHost'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean // bigger panel (Location)
  scroll?: boolean // false = children manage their own scrolling (Goal Planner)
}

// Slides in from the right; the dashboard behind is dimmed and blurred.
function SidePanel({ open, onClose, title, children, wide = false, scroll = true }: Props) {
  const [seen, setSeen] = useState(open)
  const [host, setHost] = useState<HTMLElement | null>(null)
  if (open && !seen) setSeen(true) // mount children on first open and keep them for the slide-out

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!seen) return null

  return createPortal(
    <div
      className={`home-page font-hand fixed inset-0 z-[90] ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Blur strength: change backdrop-blur-[10px] and bg-black/35 */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/35 backdrop-blur-[10px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        ref={setHost}
        className={`absolute right-3 top-0 bottom-0 my-auto overflow-hidden flex flex-col rounded-3xl border border-(--h-pink)/30 shadow-[0_0_60px_var(--h-glow)] backdrop-blur-xl bg-white/92 dark:bg-[#1f1a1a]/94 text-black dark:text-white transition-transform duration-300 ease-out ${
          wide
            ? 'w-[calc(100%-1.5rem)] lg:w-[52rem] h-[min(90vh,780px)]'
            : 'w-[calc(100%-1.5rem)] sm:w-[30rem] h-[min(86vh,680px)]'
        } ${open ? 'translate-x-0' : 'translate-x-[115%]'}`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="g-label text-sm">{title}</h2>
          <button onClick={onClose} className="t-muted hover:text-(--g-danger) text-lg leading-none" title="Close">
            ✕
          </button>
        </div>
        <PanelHost.Provider value={host}>
          <div
            className={`flex-1 min-h-0 px-5 pb-5 ${scroll ? 'overflow-y-auto soft-scroll' : 'overflow-hidden'}`}
          >
            {children}
          </div>
        </PanelHost.Provider>
      </aside>
    </div>,
    document.body
  )
}

export default SidePanel
