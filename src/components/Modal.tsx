import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="g-backdrop fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="g-modal glass p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal