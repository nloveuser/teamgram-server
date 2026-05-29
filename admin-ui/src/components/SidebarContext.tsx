'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

interface Ctx { open: boolean; toggle: () => void; close: () => void }
const Ctx = createContext<Ctx>({ open: false, toggle: () => {}, close: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Ctx.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSidebar = () => useContext(Ctx)
