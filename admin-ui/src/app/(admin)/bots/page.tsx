'use client'
import { useEffect, useState, type FormEvent } from 'react'
import Topbar from '@/components/Topbar'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'
import type { Bot } from '@/lib/types'

const fd = (ts: number) =>
  ts ? new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const BOT_TYPES = [
  { value: 3, label: '🤖 Regular Bot',   desc: 'Standard user-created bot (UserTypeBot)' },
  { value: 4, label: '🛡 Service Bot',   desc: 'System service account (UserTypeService)' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy token"
      className="text-xs text-muted hover:text-accent transition-colors ml-1 flex-shrink-0"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function TokenCell({ token }: { token: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-xs text-muted">
        {show ? token : token.slice(0, token.indexOf(':') + 6) + '••••••••'}
      </span>
      <button
        onClick={() => setShow(v => !v)}
        className="text-xs text-muted hover:text-tx transition-colors"
        title={show ? 'Hide' : 'Show'}
      >
        {show ? '🙈' : '👁'}
      </button>
      <CopyButton text={token} />
    </div>
  )
}

export default function BotsPage() {
  const toast = useToast()
  const [bots, setBots]         = useState<Bot[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<{ id: number; token: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await api.bots()
      setBots(d.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setCreating(true)
    try {
      const result = await api.createBot({
        first_name:  fd.get('first_name') as string,
        username:    (fd.get('username') as string).replace('@', ''),
        description: fd.get('description') as string,
        bot_type:    Number(fd.get('bot_type')),
      })
      setNewToken(result)
      toast.push('Bot created successfully')
      setShowForm(false)
      load()
      ;(e.target as HTMLFormElement).reset()
    } catch (ex) {
      toast.push((ex as Error).message, 'err')
    } finally {
      setCreating(false)
    }
  }

  async function deleteBot(id: number, name: string) {
    if (!confirm(`Delete bot "${name}" (#${id})?`)) return
    try {
      await api.deleteBot(id)
      toast.push('Bot deleted')
      setBots(bs => bs.filter(b => b.id !== id))
    } catch (ex) {
      toast.push((ex as Error).message, 'err')
    }
  }

  return (
    <>
      <Topbar title="Bots" />
      <div className="p-6 space-y-5">

        {/* New token banner */}
        {newToken && (
          <div className="bg-ok/8 border border-ok/25 rounded-xl p-4 flex items-start gap-3">
            <span className="text-ok text-xl">✓</span>
            <div className="flex-1">
              <div className="font-semibold text-ok text-sm mb-1">Bot created — save this token now, it won&apos;t be shown again</div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-bg rounded px-2 py-1 text-tx">{newToken.token}</code>
                <CopyButton text={newToken.token} />
              </div>
            </div>
            <button onClick={() => setNewToken(null)} className="text-ok hover:text-ok/70 text-lg">×</button>
          </div>
        )}

        {/* Create Bot panel */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold flex-1">System Bots</h2>
            <span className="text-xs font-bold bg-purple/10 text-purple px-2.5 py-1 rounded-full">
              {bots.length}
            </span>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-h transition-all"
            >
              {showForm ? '✕ Cancel' : '+ Create Bot'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={onSubmit} className="px-5 py-5 border-b border-border bg-surface2/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Display Name <span className="text-err">*</span>
                  </label>
                  <input
                    name="first_name"
                    type="text"
                    placeholder="My Service Bot"
                    required
                    className="w-full bg-surface border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <input
                    name="username"
                    type="text"
                    placeholder="@my_service_bot"
                    className="w-full bg-surface border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Bot Type
                  </label>
                  <select
                    name="bot_type"
                    defaultValue={3}
                    className="w-full bg-surface border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    {BOT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    name="description"
                    type="text"
                    placeholder="What this bot does…"
                    className="w-full bg-surface border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                  />
                </div>
              </div>

              {/* Bot type explanation */}
              <div className="grid grid-cols-2 gap-3">
                {BOT_TYPES.map(t => (
                  <div key={t.value} className="bg-surface rounded-lg border border-border p-3">
                    <div className="text-xs font-semibold text-tx">{t.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{t.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-h text-white rounded-lg px-5 py-2 text-sm font-semibold transition-all disabled:opacity-40"
                >
                  {creating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {creating ? 'Creating…' : 'Create Bot'}
                </button>
              </div>
            </form>
          )}

          {/* Bots table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface2/30">
                  {['ID','Bot','Type','Token','Description','Created',''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-14">
                    <div className="inline-block w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                  </td></tr>
                ) : bots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-14">
                      <div className="text-3xl mb-2">🤖</div>
                      <div className="text-sm">No bots yet</div>
                      <div className="text-xs mt-1">Click &quot;+ Create Bot&quot; to add one</div>
                    </td>
                  </tr>
                ) : bots.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface2/40">
                    <td className="px-4 py-3 text-xs text-muted font-mono">{b.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-semibold text-tx flex items-center gap-1.5">
                          🤖 {b.first_name}
                          {b.verified && (
                            <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">✓</span>
                          )}
                        </div>
                        {b.username && <div className="text-accent text-xs">@{b.username}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${b.bot_type === 4 ? 'bg-ok/10 text-ok' : 'bg-purple/10 text-purple'}`}>
                        {b.bot_type === 4 ? '🛡 Service' : '🤖 Bot'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><TokenCell token={b.token} /></td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[180px] truncate">{b.description || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fd(b.date2)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteBot(b.id, b.first_name)}
                        className="text-xs text-err border border-err/25 bg-err/8 hover:bg-err/18 rounded-lg px-2.5 py-1 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note about enterprise bots */}
        <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 text-xs text-warn/80">
          <strong className="text-warn">Note:</strong> <code>auth.importBotAuthorization</code> (external bot token login) is an enterprise feature
          and is disabled in the open-source build. System bots created here can be used internally by the server.
          For full external bot support (BotFather flow), an enterprise license is required.
        </div>
      </div>
    </>
  )
}
