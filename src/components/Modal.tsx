import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

function Modal({ open, onClose, children, className = 'max-w-sm' }: ModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-h-[90vh] overflow-y-auto p-5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/85 text-black dark:bg-[#1a1416]/85 dark:text-white ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal