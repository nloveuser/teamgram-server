'use client'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from './Toast'

interface Props { title: string }

export default function Topbar({ title }: Props) {
  const router = useRouter()
  const toast  = useToast()

  const username =
    typeof window !== 'undefined' ? (localStorage.getItem('tg_user') ?? 'admin') : 'admin'

  async function logout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('tg_tok')
    localStorage.removeItem('tg_user')
    toast.push('Signed out', 'ok')
    router.replace('/login/')
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-3 sticky top-0 z-40">
      <h1 className="text-base font-bold flex-1 text-tx">{title}</h1>

      <div className="flex items-center gap-2 text-xs text-muted">
        <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold uppercase">
          {username[0]}
        </div>
        <span>{username}</span>
      </div>

      <button
        onClick={logout}
        className="text-xs font-semibold text-muted border border-border2 rounded-lg px-3 py-1.5 hover:text-tx hover:bg-surface2 transition-all"
      >
        Sign out
      </button>
    </header>
  )
}
