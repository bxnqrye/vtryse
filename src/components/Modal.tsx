import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  z?: string
}

// Rendered in a portal, so it carries the homepage font + pink tokens itself (home-page, font-hand).
function Modal({ open, onClose, children, className = 'max-w-sm', z = 'z-[100]' }: ModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className={`home-page font-hand fixed inset-0 ${z} flex items-center justify-center px-4 bg-black/40 backdrop-blur-md`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-h-[90vh] overflow-y-auto p-5 rounded-2xl border border-(--h-pink)/30 shadow-[0_0_50px_var(--h-glow)] backdrop-blur-xl bg-white/90 text-black dark:bg-[#1f1a1a]/90 dark:text-white ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal
