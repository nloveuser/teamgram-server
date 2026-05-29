'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { api } from '@/lib/api'
import type { Stats, User, Chat } from '@/lib/types'

const AVATAR_COLORS = ['#2f81f7','#3fb950','#a371f7','#d29922','#f85149','#58a6ff']
const ac = (id: number) => AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
const ini = (u: User) => ((u.first_name[0]??'') + (u.last_name[0]??'')).toUpperCase() || '?'
const N = (n?: number) => n != null ? n.toLocaleString() : '—'
const fd = (ts: number) =>
  ts ? new Date(ts*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'

const STAT_CARDS = [
  { id: 'total_users',   icon: '👥', label: 'Total Users',     bg: 'bg-accent/10' },
  { id: 'deleted_users', icon: '🚫', label: 'Banned / Deleted', bg: 'bg-err/10' },
  { id: 'premium_users', icon: '⭐', label: 'Premium',          bg: 'bg-warn/10' },
  { id: 'bot_users',     icon: '🤖', label: 'Bots',             bg: 'bg-purple/10' },
  { id: 'total_chats',   icon: '💬', label: 'Chats',            bg: 'bg-ok/10' },
  { id: 'total_messages',icon: '✉️', label: 'Messages',         bg: 'bg-accent/8' },
] as const

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.stats(), api.users(1), api.chats(1)]).then(([st, ul, cl]) => {
      setStats(st)
      setUsers(ul.items.slice(0, 8))
      setChats(cl.items.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {STAT_CARDS.map(card => (
            <div key={card.id} className="bg-surface border border-border rounded-xl p-4 hover:border-border2 transition-colors">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {card.icon}
              </div>
              <div className="text-2xl font-extrabold text-tx leading-none">
                {loading ? <span className="opacity-30">—</span> : N(stats?.[card.id])}
              </div>
              <div className="text-xs text-muted mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent users */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <span className="text-sm font-bold text-tx flex-1">Recent Users</span>
              <span className="text-xs text-muted">last 8</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">User</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Phone</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center text-muted py-8 text-sm">Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-muted py-8 text-sm">No data</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface2/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                             style={{ background: ac(u.id) }}>
                          {ini(u)}
                        </div>
                        <div>
                          <div className="font-medium text-tx text-xs">{u.first_name} {u.last_name}</div>
                          {u.username && <div className="text-accent text-[11px]">@{u.username}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{u.phone || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.deleted ? 'bg-err/10 text-err' : 'bg-ok/10 text-ok'}`}>
                        {u.deleted ? 'Banned' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent chats */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <span className="text-sm font-bold text-tx flex-1">Recent Chats</span>
              <span className="text-xs text-muted">last 8</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Chat</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Members</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center text-muted py-8 text-sm">Loading…</td></tr>
                ) : chats.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-muted py-8 text-sm">No data</td></tr>
                ) : chats.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface2/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-ok/15"
                             style={{ background: ac(c.id) }}>💬</div>
                        <span className="font-medium text-tx text-xs truncate max-w-[140px]">{c.title || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-xs">{N(c.participant_count)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{fd(c.date2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  )
}
