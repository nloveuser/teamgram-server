'use client'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'ok' | 'err'
interface Toast { id: number; msg: string; type: ToastType }

interface Ctx {
  push: (msg: string, type?: ToastType) => void
}

const ToastCtx = createContext<Ctx>({ push: () => {} })

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])

  const push = useCallback((msg: string, type: ToastType = 'ok') => {
    const id = ++_id
    setList(p => [...p, { id, msg, type }])
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {list.map(t => (
          <div
            key={t.id}
            className={[
              'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl pointer-events-auto border',
              'animate-[slideIn_.2s_ease]',
              t.type === 'ok'
                ? 'bg-surface2 text-ok border-ok/20'
                : 'bg-surface2 text-err border-err/20',
            ].join(' ')}
          >
            <span>{t.type === 'ok' ? '✓' : '✕'}</span>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
