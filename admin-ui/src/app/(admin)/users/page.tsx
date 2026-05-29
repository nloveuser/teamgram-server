'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Topbar from '@/components/Topbar'
import UserModal from '@/components/UserModal'
import { api } from '@/lib/api'
import { parsePhone } from '@/lib/phone'
import { useToast } from '@/components/Toast'
import type { User, UserFlags } from '@/lib/types'

// ── helpers ────────────────────────────────────────────────────────────────────
const COLORS = ['#2f81f7','#3fb950','#a371f7','#d29922','#f85149','#58a6ff']
const PEER_COLORS = ['','#e57373','#ffb74d','#ce93d8','#81c784','#4dd0e1','#64b5f6','#f48fb1']

const ac  = (id: number) => COLORS[Math.abs(id) % COLORS.length]
const ini = (u: User)    => ((u.first_name[0]??'') + (u.last_name[0]??'')).toUpperCase() || '?'
const fd  = (ts: number) =>
  ts ? new Date(ts*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'

function UserBadges({ user }: { user: User }) {
  const badges: [string, string][] = []
  if (user.is_bot)    badges.push(['🤖 Bot',      'bg-purple/10 text-purple'])
  if (user.premium)   badges.push(['⭐ Premium',   'bg-warn/10 text-warn'])
  if (user.verified)  badges.push(['✓ Verified',   'bg-accent/10 text-accent'])
  if (user.support)   badges.push(['🛠 Support',   'bg-ok/10 text-ok'])
  if (user.scam)      badges.push(['⚠️ Scam',      'bg-warn/10 text-warn'])
  if (user.fake)      badges.push(['🚫 Fake',      'bg-err/10 text-err'])
  if (user.restricted)badges.push(['🔒 Restricted','bg-muted/10 text-muted'])
  if (badges.length === 0) return <span className="text-xs text-muted">User</span>
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map(([label, cls]) => (
        <span key={label} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
          {label}
        </span>
      ))}
    </div>
  )
}

// ── Bulk flags panel ──────────────────────────────────────────────────────────
const BULK_FLAGS: { key: keyof Pick<UserFlags,'verified'|'premium'|'support'|'scam'|'fake'|'restricted'>; icon: string; label: string }[] = [
  { key: 'verified',   icon: '✓',  label: 'Verified'   },
  { key: 'premium',    icon: '⭐', label: 'Premium'    },
  { key: 'support',    icon: '🛠', label: 'Support'    },
  { key: 'scam',       icon: '⚠️', label: 'Scam'       },
  { key: 'fake',       icon: '🚫', label: 'Fake'       },
  { key: 'restricted', icon: '🔒', label: 'Restricted' },
]

const PEER_COLOR_OPTIONS = [
  { v: 0, label: 'Default', style: 'bg-muted/30' },
  { v: 1, label: 'Red',     style: 'bg-[#e57373]' },
  { v: 2, label: 'Orange',  style: 'bg-[#ffb74d]' },
  { v: 3, label: 'Purple',  style: 'bg-[#ce93d8]' },
  { v: 4, label: 'Green',   style: 'bg-[#81c784]' },
  { v: 5, label: 'Teal',    style: 'bg-[#4dd0e1]' },
  { v: 6, label: 'Blue',    style: 'bg-[#64b5f6]' },
  { v: 7, label: 'Pink',    style: 'bg-[#f48fb1]' },
]

interface BulkState {
  flags: Partial<Record<keyof UserFlags, boolean | null>>
  color: number | null
}

function BulkBar({
  count,
  onApply,
  onClear,
  loading,
}: {
  count: number
  onApply: (state: BulkState) => void
  onClear: () => void
  loading: boolean
}) {
  const [flagState, setFlagState] = useState<Record<string, boolean | null>>({})
  const [color, setColor]         = useState<number | null>(null)

  function cycleFlag(key: string) {
    setFlagState(prev => {
      const cur = prev[key] ?? null
      return { ...prev, [key]: cur === null ? true : cur === true ? false : null }
    })
  }

  const flagLabel = (v: boolean | null) =>
    v === true ? 'ON' : v === false ? 'OFF' : '—'
  const flagCls = (v: boolean | null) =>
    v === true  ? 'bg-ok/15 text-ok border-ok/30' :
    v === false ? 'bg-err/15 text-err border-err/30' :
                  'bg-surface2 text-muted border-border2'

  function apply() {
    const flags: BulkState['flags'] = {}
    for (const [k, v] of Object.entries(flagState)) {
      if (v !== null) flags[k as keyof UserFlags] = v as boolean
    }
    onApply({ flags, color })
  }

  const anySet = Object.values(flagState).some(v => v !== null) || color !== null

  return (
    <div className="flex flex-col gap-3 px-5 py-4 bg-surface2/60 border-b border-border">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-tx">{count} selected</span>
        <span className="text-muted">· Click flags to toggle ON/OFF/—</span>
        <button onClick={onClear} className="ml-auto text-xs text-muted hover:text-tx border border-border2 rounded-lg px-2.5 py-1 hover:bg-surface transition-all">
          Clear selection
        </button>
        <button
          onClick={apply}
          disabled={!anySet || loading}
          className="text-xs font-semibold bg-accent text-white rounded-lg px-3 py-1.5 hover:bg-accent-h transition-all disabled:opacity-40"
        >
          {loading ? 'Applying…' : `Apply to ${count} users`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted w-12">Flags</span>
        {BULK_FLAGS.map(f => {
          const v = flagState[f.key] ?? null
          return (
            <button
              key={f.key}
              onClick={() => cycleFlag(f.key)}
              title={`Click to cycle: — → ON → OFF → —`}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${flagCls(v)}`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span className="text-[10px] font-bold ml-0.5 opacity-70">{flagLabel(v)}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted w-12">Color</span>
        {PEER_COLOR_OPTIONS.map(c => (
          <button
            key={c.v}
            title={c.label}
            onClick={() => setColor(prev => prev === c.v ? null : c.v)}
            className={[
              'w-6 h-6 rounded-full transition-all border-2',
              c.style,
              color === c.v ? 'border-white scale-125 shadow-md' : 'border-transparent opacity-60 hover:opacity-100',
            ].join(' ')}
          />
        ))}
        {color !== null && (
          <span className="text-xs text-muted ml-1">
            → {PEER_COLOR_OPTIONS[color]?.label}
            <button onClick={() => setColor(null)} className="ml-1 text-err">×</button>
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const toast = useToast()
  const [users, setUsers]       = useState<User[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [q, setQ]               = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<User | null>(null)
  const [checked, setChecked]   = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const debounce = useRef<NodeJS.Timeout>()

  const load = useCallback(async (pg: number, query: string) => {
    setLoading(true)
    try {
      const d = await api.users(pg, query)
      setUsers(d.items)
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

  function onSaved(updated: User) {
    setUsers(us => us.map(u => u.id === updated.id ? updated : u))
    setSelected(null)
  }

  function toggleCheck(id: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (checked.size === users.length) {
      setChecked(new Set())
    } else {
      setChecked(new Set(users.map(u => u.id)))
    }
  }

  async function applyBulk({ flags, color }: BulkState) {
    if (checked.size === 0) return
    setBulkLoading(true)
    try {
      const payload: Partial<UserFlags> = { ...(flags as Partial<UserFlags>) }
      if (color !== null) payload.color = color
      const result = await api.bulkFlags([...checked], payload)
      toast.push(`Applied to ${result.updated} users`)
      setChecked(new Set())
      load(page, q)
    } catch (ex) {
      toast.push((ex as Error).message, 'err')
    } finally {
      setBulkLoading(false)
    }
  }

  const pages = Math.max(1, Math.ceil(total / 20))
  const allChecked = users.length > 0 && checked.size === users.length

  return (
    <>
      <Topbar title="Users" />
      {selected && (
        <UserModal user={selected} onClose={() => setSelected(null)} onSaved={onSaved} />
      )}

      <div className="p-6">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <span className="text-sm font-bold text-tx flex-1">Users</span>
            <span className="text-xs font-bold bg-accent/10 text-accent px-2.5 py-1 rounded-full">
              {total.toLocaleString()}
            </span>
            {checked.size > 0 && (
              <span className="text-xs font-semibold text-warn bg-warn/10 border border-warn/25 px-2.5 py-1 rounded-full">
                {checked.size} selected
              </span>
            )}
            <div className="relative w-56">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">🔍</span>
              <input
                type="search"
                placeholder="Name / phone / @username…"
                className="w-full bg-surface2 border border-border2 text-tx rounded-lg pl-7 pr-3 py-2 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                onChange={e => onSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk bar */}
          {checked.size > 0 && (
            <BulkBar
              count={checked.size}
              onApply={applyBulk}
              onClear={() => setChecked(new Set())}
              loading={bulkLoading}
            />
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface2/30">
                  <th className="px-4 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="accent-accent w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </th>
                  {['ID','User','Phone','Flags','Status','Registered',''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-16">
                    <div className="inline-block w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-muted py-12 text-sm">No users found</td></tr>
                ) : users.map(u => {
                  const ph    = parsePhone(u.phone)
                  const isChk = checked.has(u.id)
                  const nameColor = u.color ? PEER_COLORS[u.color] : null

                  return (
                    <tr
                      key={u.id}
                      className={[
                        'border-b border-border last:border-0 hover:bg-surface2/40 cursor-pointer',
                        isChk ? 'bg-accent/5' : '',
                      ].join(' ')}
                      onClick={() => setSelected(u)}
                    >
                      <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleCheck(u.id) }}>
                        <input
                          type="checkbox"
                          checked={isChk}
                          onChange={() => {}}
                          className="accent-accent w-3.5 h-3.5 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted font-mono">{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: ac(u.id) }}
                          >
                            {ini(u)}
                          </div>
                          <div>
                            <div
                              className="font-semibold text-sm"
                              style={{ color: nameColor ?? undefined }}
                            >
                              {u.first_name} {u.last_name}
                              {nameColor && (
                                <span
                                  className="inline-block w-2 h-2 rounded-full ml-1.5 align-middle"
                                  style={{ background: nameColor }}
                                  title={`Color ${u.color}`}
                                />
                              )}
                            </div>
                            {u.username && <div className="text-accent text-xs">@{u.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span title={ph.country}>{ph.flag}</span>
                          <span className="font-mono text-xs text-muted">{ph.formatted}</span>
                          {!ph.valid && <span className="text-err text-[10px]" title="Invalid format">⚠</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><UserBadges user={u} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${u.deleted ? 'bg-err/10 text-err' : 'bg-ok/10 text-ok'}`}>
                          {u.deleted ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fd(u.date2)}</td>
                      <td className="px-4 py-3">
                        <button
                          className="text-xs text-muted hover:text-tx border border-border2 rounded-lg px-2.5 py-1 hover:bg-surface2 transition-all"
                          onClick={e => { e.stopPropagation(); setSelected(u) }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
