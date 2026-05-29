'use client'
import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { parsePhone } from '@/lib/phone'
import { useToast } from './Toast'
import type { User, UserFlags } from '@/lib/types'

interface Props {
  user: User
  onClose: () => void
  onSaved: (updated: User) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#2f81f7','#3fb950','#a371f7','#d29922','#f85149','#58a6ff']
const ac = (id: number) => AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]
const ini = (u: User) => ((u.first_name[0]??'') + (u.last_name[0]??'')).toUpperCase() || '?'
const fd  = (ts: number) =>
  ts ? new Date(ts*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'

// Telegram peer color palette
const PEER_COLORS = [
  { index: 0, label: 'Default', cls: 'bg-muted/20 border-border2' },
  { index: 1, label: 'Red',     cls: 'bg-[#e57373]' },
  { index: 2, label: 'Orange',  cls: 'bg-[#ffb74d]' },
  { index: 3, label: 'Purple',  cls: 'bg-[#ce93d8]' },
  { index: 4, label: 'Green',   cls: 'bg-[#81c784]' },
  { index: 5, label: 'Teal',    cls: 'bg-[#4dd0e1]' },
  { index: 6, label: 'Blue',    cls: 'bg-[#64b5f6]' },
  { index: 7, label: 'Pink',    cls: 'bg-[#f48fb1]' },
]

const FLAG_DEFS = [
  { key: 'verified'  as const, label: 'Verified',   icon: '✓',  color: 'text-accent', desc: 'Official verified badge (blue checkmark)' },
  { key: 'premium'   as const, label: 'Premium',    icon: '⭐', color: 'text-warn',   desc: 'Premium subscription active' },
  { key: 'support'   as const, label: 'Support',    icon: '🛠', color: 'text-ok',     desc: 'Telegram support account' },
  { key: 'scam'      as const, label: 'Scam',       icon: '⚠️', color: 'text-warn',   desc: 'Marked as potential scam' },
  { key: 'fake'      as const, label: 'Fake',       icon: '🚫', color: 'text-err',    desc: 'Marked as impersonator / fake' },
  { key: 'restricted'as const, label: 'Restricted', icon: '🔒', color: 'text-muted',  desc: 'Account restricted from sending' },
]

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors duration-200 ${on ? 'bg-accent' : 'bg-border2'}`}
      role="switch" aria-checked={on}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ── Color Picker ──────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {PEER_COLORS.map(c => (
          <button key={c.index} type="button" title={c.label} onClick={() => onChange(c.index)}
            className={`w-7 h-7 rounded-full transition-all border-2 flex items-center justify-center ${c.cls} ${value === c.index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
            {value === c.index && <span className="text-white text-xs font-bold drop-shadow">✓</span>}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-muted mt-1">{value === 0 ? 'No custom color' : `${PEER_COLORS[value]?.label} accent`}</div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-surface2 border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted'

// ── Main component ─────────────────────────────────────────────────────────────
export default function UserModal({ user, onClose, onSaved }: Props) {
  const toast = useToast()
  const phone = parsePhone(user.phone)
  const [tab, setTab] = useState<'flags' | 'profile' | 'danger'>('flags')

  // ── Flags state ──────────────────────────────────────────────────────────────
  const [flags, setFlags] = useState<UserFlags>({
    verified: user.verified, premium: user.premium, support: user.support,
    scam: user.scam, fake: user.fake, restricted: user.restricted,
    restriction_reason: user.restriction_reason ?? '',
    color: user.color ?? 0, profile_color: user.profile_color ?? 0,
  })
  const [savingFlags, setSavingFlags] = useState(false)

  async function saveFlags() {
    setSavingFlags(true)
    try {
      await api.setFlags(user.id, flags)
      toast.push('Flags saved')
      onSaved({ ...user, ...flags })
    } catch(e) { toast.push((e as Error).message, 'err') }
    finally { setSavingFlags(false) }
  }

  // ── Profile state ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    first_name: user.first_name, last_name: user.last_name,
    username: user.username, phone: user.phone, about: user.about ?? '',
    clear_photo: false,
  })
  const [savingProfile, setSavingProfile] = useState(false)

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.updateProfile(user.id, profile)
      toast.push('Profile updated')
      onSaved({ ...user, ...profile, photo_id: profile.clear_photo ? 0 : user.photo_id })
    } catch(e) { toast.push((e as Error).message, 'err') }
    finally { setSavingProfile(false) }
  }

  // ── Danger state ──────────────────────────────────────────────────────────────
  const [newID, setNewID]         = useState('')
  const [changingID, setChangingID] = useState(false)
  const [banning, setBanning]       = useState(false)

  async function changeID() {
    const nid = parseInt(newID)
    if (!nid || isNaN(nid)) { toast.push('Invalid ID', 'err'); return }
    if (!confirm(`Change user ID from ${user.id} → ${nid}?\n\nThis will update all related tables. Cannot be undone easily.`)) return
    setChangingID(true)
    try {
      const r = await api.changeID(user.id, nid)
      toast.push(`ID changed: ${r.old_id} → ${r.new_id}`)
      onSaved({ ...user, id: nid })
      onClose()
    } catch(e) { toast.push((e as Error).message, 'err') }
    finally { setChangingID(false) }
  }

  async function toggleBan() {
    setBanning(true)
    try {
      if (user.deleted) {
        await api.unbanUser(user.id); toast.push('User unbanned')
        onSaved({ ...user, deleted: false })
      } else {
        if (!confirm(`Ban user ${user.first_name} #${user.id}?`)) { setBanning(false); return }
        await api.banUser(user.id); toast.push('User banned')
        onSaved({ ...user, deleted: true })
      }
      onClose()
    } catch(e) { toast.push((e as Error).message, 'err') }
    finally { setBanning(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'flags'  as const, label: 'Flags' },
    { id: 'profile'as const, label: 'Profile' },
    { id: 'danger' as const, label: '⚠️ Danger' },
  ]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
               style={{ background: ac(user.id) }}>
            {ini(user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-tx truncate">{user.first_name} {user.last_name}</div>
            <div className="text-xs text-muted">
              #{user.id}
              {user.username && <span className="ml-2 text-accent">@{user.username}</span>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg text-muted hover:text-tx hover:bg-surface2 flex items-center justify-center text-lg">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-all ${tab === t.id ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-tx'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Flags tab ── */}
          {tab === 'flags' && <>
            {/* Phone info */}
            <div className="bg-surface2 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">{phone.flag}</span>
              <div className="flex-1">
                <div className="font-mono text-base font-semibold text-tx">{phone.formatted}</div>
                <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                  <span>{phone.country}</span>
                  {phone.valid
                    ? <span className="text-ok text-[10px] font-semibold bg-ok/10 px-1.5 py-0.5 rounded-full">✓ Valid</span>
                    : <span className="text-err text-[10px] font-semibold bg-err/10 px-1.5 py-0.5 rounded-full">✕ Invalid</span>}
                </div>
              </div>
            </div>

            {/* Quick info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Type',       user.is_bot ? '🤖 Bot' : '👤 User'],
                ['Status',     user.deleted ? '🚫 Banned' : '✓ Active'],
                ['Registered', fd(user.date2)],
                ['Photo ID',   String(user.photo_id || 0)],
              ].map(([k,v]) => (
                <div key={k} className="bg-surface2 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted font-semibold uppercase tracking-wide">{k}</div>
                  <div className="text-sm font-medium text-tx mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {/* Flag toggles */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Flags</div>
              <div className="space-y-2">
                {FLAG_DEFS.map(fd => (
                  <div key={fd.key} className="flex items-center gap-3 bg-surface2 rounded-xl px-4 py-3">
                    <span className="text-xl w-7 text-center">{fd.icon}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${fd.color}`}>{fd.label}</div>
                      <div className="text-[11px] text-muted">{fd.desc}</div>
                    </div>
                    <Toggle on={flags[fd.key] as boolean} onChange={v => setFlags(f => ({...f, [fd.key]: v}))} />
                  </div>
                ))}
                {flags.restricted && (
                  <input type="text" value={flags.restriction_reason}
                    onChange={e => setFlags(f => ({...f, restriction_reason: e.target.value}))}
                    placeholder="Restriction reason (e.g. spam, abuse)" className={inputCls} />
                )}
              </div>
            </div>

            {/* Color pickers */}
            <div className="space-y-4">
              <ColorPicker label="Name Color (in chats)" value={flags.color}
                onChange={v => setFlags(f => ({...f, color: v}))} />
              <ColorPicker label="Profile Color" value={flags.profile_color}
                onChange={v => setFlags(f => ({...f, profile_color: v}))} />
            </div>
          </>}

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <form id="profile-form" onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input className={inputCls} value={profile.first_name}
                    onChange={e => setProfile(p => ({...p, first_name: e.target.value}))} placeholder="First name" />
                </Field>
                <Field label="Last name">
                  <input className={inputCls} value={profile.last_name}
                    onChange={e => setProfile(p => ({...p, last_name: e.target.value}))} placeholder="Last name" />
                </Field>
              </div>
              <Field label="Username">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                  <input className={inputCls + ' pl-7'} value={profile.username}
                    onChange={e => setProfile(p => ({...p, username: e.target.value.replace('@','')}))}
                    placeholder="username" />
                </div>
              </Field>
              <Field label="Phone number">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg leading-none">
                    {parsePhone(profile.phone).flag}
                  </span>
                  <input className={inputCls + ' pl-9'} value={profile.phone}
                    onChange={e => setProfile(p => ({...p, phone: e.target.value}))}
                    placeholder="+1234567890" />
                </div>
                <div className="text-[11px] text-muted mt-1">
                  {parsePhone(profile.phone).country} · {parsePhone(profile.phone).valid ? '✓ valid format' : '✕ invalid format'}
                </div>
              </Field>
              <Field label="Bio / About">
                <textarea className={inputCls + ' resize-none h-20'} value={profile.about}
                  onChange={e => setProfile(p => ({...p, about: e.target.value}))}
                  placeholder="About text…" />
              </Field>
              <Field label="Avatar">
                <div className="flex items-center gap-3 bg-surface2 rounded-xl p-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                       style={{ background: ac(user.id) }}>
                    {ini(user)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted mb-1">Current photo_id: <span className="font-mono text-tx">{user.photo_id || 0}</span></div>
                    <p className="text-[11px] text-muted">Full avatar upload requires the DFS service. You can clear the current avatar below.</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={profile.clear_photo}
                    onChange={e => setProfile(p => ({...p, clear_photo: e.target.checked}))}
                    className="accent-err w-3.5 h-3.5 rounded" />
                  <span className="text-xs text-err font-medium">Clear avatar (set photo_id = 0)</span>
                </label>
              </Field>
            </form>
          )}

          {/* ── Danger tab ── */}
          {tab === 'danger' && (
            <div className="space-y-4">
              {/* Change ID */}
              <div className="bg-err/5 border border-err/25 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-sm font-bold text-err mb-1">⚡ Change User ID</div>
                  <p className="text-xs text-muted">
                    Updates the user&apos;s primary key and all foreign key references across the database.
                    Current ID: <span className="font-mono text-tx">{user.id}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <input type="number" value={newID} onChange={e => setNewID(e.target.value)}
                    placeholder="New ID…" className={inputCls + ' flex-1'} />
                  <button onClick={changeID} disabled={changingID || !newID}
                    className="text-xs font-semibold bg-err/15 text-err border border-err/30 rounded-lg px-4 py-2 hover:bg-err/25 transition-all disabled:opacity-40 whitespace-nowrap">
                    {changingID ? 'Changing…' : 'Change ID'}
                  </button>
                </div>
                <p className="text-[11px] text-warn">⚠ Requires server cache flush after change. The Teamgram server caches user data in Redis.</p>
              </div>

              {/* Ban / Unban */}
              <div className={`border rounded-xl p-4 ${user.deleted ? 'bg-ok/5 border-ok/25' : 'bg-err/5 border-err/25'}`}>
                <div className={`text-sm font-bold mb-1 ${user.deleted ? 'text-ok' : 'text-err'}`}>
                  {user.deleted ? '✓ Unban User' : '🚫 Ban User'}
                </div>
                <p className="text-xs text-muted mb-3">
                  {user.deleted
                    ? 'Restore access for this user account.'
                    : 'Mark this account as deleted. User will lose access immediately.'}
                </p>
                <button onClick={toggleBan} disabled={banning}
                  className={`text-xs font-semibold rounded-lg px-4 py-2 border transition-all disabled:opacity-40 ${user.deleted ? 'bg-ok/15 text-ok border-ok/30 hover:bg-ok/25' : 'bg-err/15 text-err border-err/30 hover:bg-err/25'}`}>
                  {banning ? '…' : user.deleted ? 'Unban' : 'Ban User'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-surface flex-shrink-0">
          <button onClick={onClose}
            className="text-xs font-semibold text-muted border border-border2 rounded-lg px-4 py-2 hover:text-tx hover:bg-surface2 transition-all">
            Close
          </button>
          <div className="flex-1" />
          {tab === 'flags' && (
            <button onClick={saveFlags} disabled={savingFlags}
              className="text-xs font-semibold bg-accent text-white rounded-lg px-4 py-2 hover:bg-accent-h transition-all disabled:opacity-40">
              {savingFlags ? 'Saving…' : 'Save Flags'}
            </button>
          )}
          {tab === 'profile' && (
            <button type="submit" form="profile-form" disabled={savingProfile}
              className="text-xs font-semibold bg-accent text-white rounded-lg px-4 py-2 hover:bg-accent-h transition-all disabled:opacity-40">
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
