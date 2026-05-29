'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Topbar from '@/components/Topbar'
import { api } from '@/lib/api'
import type { Chat } from '@/lib/types'

const COLORS = ['#2f81f7','#3fb950','#a371f7','#d29922','#f85149','#58a6ff']
const ac = (id: number) => COLORS[Math.abs(id) % COLORS.length]
const fd = (ts: number) =>
  ts ? new Date(ts*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'

export default function ChatsPage() {
  const [chats, setChats]   = useState<Chat[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [loading, setLoading] = useState(true)
  const debounce = useRef<NodeJS.Timeout>()

  const load = useCallback(async (pg: number, query: string) => {
    setLoading(true)
    try {
      const d = await api.chats(pg, query)
      setChats(d.items)
      setTotal(d.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, q) }, [load, page, q])

  function onSearch(v: string) {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { setPage(1); setQ(v) }, 300)
  }

  const pages = Math.max(1, Math.ceil(total / 20))

  return (
    <>
      <Topbar title="Chats & Groups" />
      <div className="p-6">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">

          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <span className="text-sm font-bold text-tx flex-1">Chats &amp; Groups</span>
            <span className="text-xs font-bold bg-accent/10 text-accent px-2.5 py-1 rounded-full">
              {total.toLocaleString()}
            </span>
            <div className="relative w-52">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">🔍</span>
              <input
                type="search"
                placeholder="Search title…"
                className="w-full bg-surface2 border border-border2 text-tx rounded-lg pl-7 pr-3 py-2 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                onChange={e => onSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface2/30">
                  {['ID','Chat','Members','Creator ID','Status','Created'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16">
                    <div className="inline-block w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                  </td></tr>
                ) : chats.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-12 text-sm">No chats found</td></tr>
                ) : chats.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface2/40">
                    <td className="px-4 py-3 text-xs text-muted font-mono">{c.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: ac(c.id) + '33' }}
                        >
                          💬
                        </div>
                        <div>
                          <div className="font-semibold text-tx text-sm">{c.title || '—'}</div>
                          {c.about && <div className="text-xs text-muted truncate max-w-[200px]">{c.about}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm">
                      {c.participant_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{c.creator_user_id}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${c.deactivated ? 'bg-muted/10 text-muted' : 'bg-ok/10 text-ok'}`}>
                        {c.deactivated ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fd(c.date2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 px-5 py-3.5 border-t border-border">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs font-semibold text-muted border border-border2 rounded-lg px-3 py-1.5 hover:text-tx hover:bg-surface2 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="text-xs font-semibold text-muted border border-border2 rounded-lg px-3 py-1.5 hover:text-tx hover:bg-surface2 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Next →
            </button>
            <span className="ml-auto text-xs text-muted">
              Page {page} of {pages} · {total.toLocaleString()} total
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
