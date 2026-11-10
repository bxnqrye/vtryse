import { createContext } from 'react'

// The slide-over panel's element. Modals opened inside a panel render INSIDE it (not at screen centre).
export const PanelHost = createContext<HTMLElement | null>(null)
