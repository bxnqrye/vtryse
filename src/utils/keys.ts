import type { KeyboardEvent } from 'react'

// Put on a wrapper: pressing Enter inside any text input runs `fn`.
// Ignores textareas, buttons, selects and file inputs.
export const onEnter = (fn: () => void) => (e: KeyboardEvent<HTMLElement>) => {
  const t = e.target as HTMLInputElement
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
  if (t.tagName !== 'INPUT' || t.type === 'file' || t.type === 'checkbox' || t.type === 'radio') return
  e.preventDefault()
  fn()
}
