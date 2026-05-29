'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { api } from '@/lib/api'
import type { SystemInfo } from '@/lib/types'

const fmtUp = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60), sc = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${sc}s`
}

interface Card { icon: string; label: string; value: string | number; sub: string }

export default function SystemPage() {
  const [info, setInfo]     = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.system().then(setInfo).finally(() => setLoading(false))
  }, [])

  const cards: Card[] = info ? [
    { icon: '🕐', label: 'Uptime',         value: fmtUp(info.uptime_seconds),          sub: 'since last start' },
    { icon: '🔧', label: 'Go Runtime',     value: info.go_version,                      sub: `${info.os} / ${info.arch}` },
    { icon: '⚡', label: 'CPU Cores',      value: info.cpus,                            sub: 'logical processors' },
    { icon: '🔄', label: 'Goroutines',     value: info.goroutines.toLocaleString(),     sub: 'active goroutines' },
    { icon: '💾', label: 'Heap Alloc',     value: info.heap_alloc_mb.toFixed(1) + ' MB', sub: `sys: ${info.heap_sys_mb.toFixed(1)} MB` },
    { icon: '📦', label: 'Total Alloc',    value: info.total_alloc_mb.toFixed(1) + ' MB', sub: 'cumulative' },
    { icon: '🗑️', label: 'GC Runs',        value: info.gc_runs.toLocaleString(),        sub: 'garbage collections' },
    { icon: '🗄️', label: 'DB Connections', value: info.db_open_conns,                   sub: `in-use: ${info.db_in_use} · idle: ${info.db_idle}` },
  ] : []

  return (
    <>
      <Topbar title="System" />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(c => (
              <div key={c.label} className="bg-surface border border-border rounded-xl p-5 hover:border-border2 transition-colors">
                <div className="text-2xl mb-3">{c.icon}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">{c.label}</div>
                <div className="text-xl font-extrabold text-tx">{c.value}</div>
                <div className="text-xs text-muted mt-1">{c.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
