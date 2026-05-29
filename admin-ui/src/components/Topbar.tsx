'use client'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from './Toast'
import { useSidebar } from './SidebarContext'

interface Props { title: string }

export default function Topbar({ title }: Props) {
  const router = useRouter()
  const toast  = useToast()
  const { toggle } = useSidebar()

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
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3 sticky top-0 z-40">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-tx hover:bg-surface2 transition-all text-lg"
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <h1 className="text-base font-bold flex-1 text-tx truncate">{title}</h1>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
        <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold uppercase">
          {username[0]}
        </div>
        <span className="hidden md:inline">{username}</span>
      </div>

      <button
        onClick={logout}
        className="text-xs font-semibold text-muted border border-border2 rounded-lg px-2.5 py-1.5 hover:text-tx hover:bg-surface2 transition-all whitespace-nowrap"
      >
        <span className="hidden sm:inline">Sign out</span>
        <span className="sm:hidden">↩</span>
      </button>
    </header>
  )
}
