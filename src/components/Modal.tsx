import { useContext } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { PanelHost } from './panelHost'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  z?: string
}

// Inside a SidePanel it fills only that panel; anywhere else it is centred on the whole screen.
function Modal({ open, onClose, children, className = 'max-w-sm', z = 'z-[100]' }: ModalProps) {
  const host = useContext(PanelHost)
  if (!open) return null

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-h-full overflow-y-auto soft-scroll p-5 rounded-2xl border border-(--h-pink)/30 shadow-[0_0_50px_var(--h-glow)] backdrop-blur-xl bg-white/92 text-black dark:bg-[#1f1a1a]/94 dark:text-white ${className}`}
    >
      {children}
    </div>
  )

  if (host) {
    return createPortal(
      <div
        className={`absolute inset-0 ${z} flex items-center justify-center p-3 rounded-3xl bg-black/35 backdrop-blur-md`}
        onClick={onClose}
      >
        {card}
      </div>,
      host
    )
  }

  return createPortal(
    <div
      className={`home-page font-hand fixed inset-0 ${z} flex items-center justify-center px-4 py-6 bg-black/40 backdrop-blur-md`}
      onClick={onClose}
    >
      {card}
    </div>,
    document.body
  )
}

export default Modal
