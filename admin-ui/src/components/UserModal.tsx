'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { parsePhone } from '@/lib/phone'
import { useToast } from './Toast'
import type { User, UserFlags } from '@/lib/types'

interface Props {
  user: User
  onClose: () => void
  onSaved: (updated: User) => void
}

const AVATAR_COLORS = ['#2f81f7','#3fb950','#a371f7','#d29922','#f85149','#58a6ff']
const ac = (id: number) => AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]

// Telegram peer color palette (index 0 = default/none, 1–7 = accent colors)
const PEER_COLORS = [
  { index: 0, label: 'Default', hex: '#7d8590', bg: 'bg-muted/20' },
  { index: 1, label: 'Red',     hex: '#e57373', bg: 'bg-[#e57373]' },
  { index: 2, label: 'Orange',  hex: '#ffb74d', bg: 'bg-[#ffb74d]' },
  { index: 3, label: 'Purple',  hex: '#ce93d8', bg: 'bg-[#ce93d8]' },
  { index: 4, label: 'Green',   hex: '#81c784', bg: 'bg-[#81c784]' },
  { index: 5, label: 'Teal',    hex: '#4dd0e1', bg: 'bg-[#4dd0e1]' },
  { index: 6, label: 'Blue',    hex: '#64b5f6', bg: 'bg-[#64b5f6]' },
  { index: 7, label: 'Pink',    hex: '#f48fb1', bg: 'bg-[#f48fb1]' },
]

function ColorPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {PEER_COLORS.map(c => (
          <button
            key={c.index}
            type="button"
            title={c.label}
            onClick={() => onChange(c.index)}
            className={[
              'w-7 h-7 rounded-full transition-all border-2 flex items-center justify-center',
              c.index === 0 ? 'bg-surface2 border-border2' : c.bg,
              value === c.index ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100',
            ].join(' ')}
          >
            {value === c.index && (
              <span className="text-white text-xs font-bold" style={{ textShadow: '0 0 3px rgba(0,0,0,.5)' }}>✓</span>
            )}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-muted mt-1.5">
        {value === 0 ? 'No custom color' : `${PEER_COLORS[value]?.label} accent`}
      </div>
    </div>
  )
}
const ini = (u: User) =>
  ((u.first_name[0] ?? '') + (u.last_name[0] ?? '')).toUpperCase() || '?'

const fmtDate = (ts: number) =>
  ts ? new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

interface FlagDef {
  key: keyof UserFlags
  label: string
  icon: string
  color: string
  desc: string
}

const FLAG_DEFS: FlagDef[] = [
  { key: 'verified',   label: 'Verified',   icon: '✓',  color: 'text-accent', desc: 'Official verified badge (blue checkmark)' },
  { key: 'premium',    label: 'Premium',    icon: '⭐', color: 'text-warn',   desc: 'Premium subscription active' },
  { key: 'support',    label: 'Support',    icon: '🛠', color: 'text-ok',     desc: 'Telegram support account' },
  { key: 'scam',       label: 'Scam',       icon: '⚠️', color: 'text-warn',   desc: 'Marked as potential scam' },
  { key: 'fake',       label: 'Fake',       icon: '🚫', color: 'text-err',    desc: 'Marked as impersonator / fake' },
  { key: 'restricted', label: 'Restricted', icon: '🔒', color: 'text-muted',  desc: 'Account restricted from sending' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={[
        'relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors duration-200',
        on ? 'bg-accent' : 'bg-border2',
      ].join(' ')}
      role="switch"
      aria-checked={on}
    >
      <span
        className={[
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          on ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export default function UserModal({ user, onClose, onSaved }: Props) {
  const toast = useToast()
  const phone = parsePhone(user.phone)

  const [flags, setFlags] = useState<UserFlags>({
    verified:           user.verified,
    premium:            user.premium,
    support:            user.support,
    scam:               user.scam,
    fake:               user.fake,
    restricted:         user.restricted,
    restriction_reason: user.restriction_reason ?? '',
    color:              user.color ?? 0,
    profile_color:      user.profile_color ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [banning, setBanning] = useState(false)

  function setFlag(key: keyof UserFlags, val: boolean) {
    setFlags(f => ({ ...f, [key]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.setFlags(user.id, flags)
      toast.push('Flags saved')
      onSaved({ ...user, ...flags })
    } catch (e) {
      toast.push((e as Error).message, 'err')
    } finally {
      setSaving(false)
    }
  }

  async function toggleBan() {
    setBanning(true)
    try {
      if (user.deleted) {
        await api.unbanUser(user.id)
        toast.push('User unbanned')
        onSaved({ ...user, deleted: false })
      } else {
        await api.banUser(user.id)
        toast.push('User banned')
        onSaved({ ...user, deleted: true })
      }
      onClose()
    } catch (e) {
      toast.push((e as Error).message, 'err')
    } finally {
      setBanning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: ac(user.id) }}
          >
            {ini(user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-tx truncate">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs text-muted">
              #{user.id}
              {user.username && <span className="ml-2 text-accent">@{user.username}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-muted hover:text-tx hover:bg-surface2 flex items-center justify-center text-lg transition-all"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Phone */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Phone Number
            </div>
            <div className="bg-surface2 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl">{phone.flag}</span>
              <div className="flex-1">
                <div className="font-mono text-base font-semibold text-tx">{phone.formatted}</div>
                <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                  <span>{phone.country}</span>
                  {phone.valid ? (
                    <span className="text-ok text-[10px] font-semibold bg-ok/10 px-1.5 py-0.5 rounded-full">
                      ✓ Valid
                    </span>
                  ) : (
                    <span className="text-err text-[10px] font-semibold bg-err/10 px-1.5 py-0.5 rounded-full">
                      ✕ Invalid
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Info
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Type', user.is_bot ? '🤖 Bot' : '👤 User'],
                ['Status', user.deleted ? '🚫 Banned' : '✓ Active'],
                ['Registered', fmtDate(user.date2)],
                ['State', String(user.state)],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface2 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted font-semibold uppercase tracking-wide">{k}</div>
                  <div className="text-sm font-medium text-tx mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {user.about && (
              <div className="mt-2 bg-surface2 rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted font-semibold uppercase tracking-wide mb-1">Bio</div>
                <div className="text-sm text-tx">{user.about}</div>
              </div>
            )}
          </div>

          {/* Flags */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Flags
            </div>
            <div className="grid grid-cols-1 gap-2">
              {FLAG_DEFS.map(fd => (
                <div
                  key={fd.key}
                  className="flex items-center gap-3 bg-surface2 rounded-xl px-4 py-3"
                >
                  <span className="text-xl w-7 text-center">{fd.icon}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${fd.color}`}>{fd.label}</div>
                    <div className="text-[11px] text-muted">{fd.desc}</div>
                  </div>
                  <Toggle
                    on={flags[fd.key as keyof UserFlags] as boolean}
                    onChange={v => setFlag(fd.key, v)}
                  />
                </div>
              ))}
            </div>

            {/* Restriction reason — shown only when restricted is on */}
            {flags.restricted && (
              <div className="mt-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
                  Restriction Reason
                </label>
                <input
                  type="text"
                  value={flags.restriction_reason}
                  onChange={e => setFlags(f => ({ ...f, restriction_reason: e.target.value }))}
                  placeholder="e.g. spam, abuse, tos_violation"
                  className="w-full bg-surface2 border border-border2 text-tx rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
                />
              </div>
            )}
          </div>

          {/* Accent Colors */}
          <div className="space-y-4">
            <ColorPicker
              label="Name Color (in chats)"
              value={flags.color}
              onChange={v => setFlags(f => ({ ...f, color: v }))}
            />
            <ColorPicker
              label="Profile Color (profile page)"
              value={flags.profile_color}
              onChange={v => setFlags(f => ({ ...f, profile_color: v }))}
            />
            <p className="text-[11px] text-muted bg-surface2 rounded-lg px-3 py-2">
              💡 Colors 1–7 = Telegram Premium accent palette. 0 = default (no accent).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-surface">
          <button
            onClick={toggleBan}
            disabled={banning}
            className={[
              'text-xs font-semibold px-3 py-2 rounded-lg border transition-all disabled:opacity-40',
              user.deleted
                ? 'bg-ok/10 text-ok border-ok/25 hover:bg-ok/20'
                : 'bg-err/10 text-err border-err/25 hover:bg-err/20',
            ].join(' ')}
          >
            {banning ? '…' : user.deleted ? 'Unban User' : 'Ban User'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-xs font-semibold text-muted border border-border2 rounded-lg px-4 py-2 hover:text-tx hover:bg-surface2 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="text-xs font-semibold bg-accent text-white rounded-lg px-4 py-2 hover:bg-accent-h transition-all disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
