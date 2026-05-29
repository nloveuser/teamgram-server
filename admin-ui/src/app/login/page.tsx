'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [err, setErr]       = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const username = fd.get('username') as string
    const password = fd.get('password') as string
    setErr(''); setLoading(true)
    try {
      const { token } = await api.login(username, password)
      localStorage.setItem('tg_tok', token)
      localStorage.setItem('tg_user', username)
      router.replace('/dashboard/')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg"
         style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(47,129,247,.18) 0%, transparent 65%), #0d1117' }}>
      <div className="w-[380px] bg-surface border border-border rounded-2xl p-10 shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-4xl">
            ✈️
          </div>
          <h1 className="text-xl font-bold text-tx">Teamgram Admin</h1>
          <p className="text-sm text-muted mt-1">Secure management panel</p>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-4 bg-err/8 border border-err/25 text-err rounded-lg px-3.5 py-2.5 text-sm">
            {err}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              name="username"
              type="text"
              placeholder="admin"
              autoComplete="username"
              required
              className="w-full bg-surface2 border border-border2 text-tx rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-surface2 border border-border2 text-tx rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-muted"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-h text-white rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-40 mt-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
