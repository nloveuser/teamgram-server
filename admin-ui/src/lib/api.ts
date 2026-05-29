import type { Stats, UserList, UserFlags, ChatList, SystemInfo, BotList, CreateBotRequest } from './types'
export type { UserFlags }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tg_tok') ?? ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tg_tok')
      window.location.href = '/login/'
    }
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
  return data as T
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request('/api/logout', { method: 'POST' }),

  stats: () => request<Stats>('/api/stats'),

  users: (page: number, q = '') => {
    const p = new URLSearchParams({ page: String(page), q })
    return request<UserList>(`/api/users?${p}`)
  },

  banUser:    (id: number) => request(`/api/users/${id}/ban`,    { method: 'POST' }),
  unbanUser:  (id: number) => request(`/api/users/${id}/unban`,  { method: 'POST' }),
  deleteUser: (id: number) => request(`/api/users/${id}/delete`, { method: 'POST' }),

  setFlags: (id: number, flags: UserFlags) =>
    request(`/api/users/${id}/flags`, {
      method: 'POST',
      body: JSON.stringify(flags),
    }),

  chats: (page: number, q = '') => {
    const p = new URLSearchParams({ page: String(page), q })
    return request<ChatList>(`/api/chats?${p}`)
  },

  system: () => request<SystemInfo>('/api/system'),

  updateProfile: (id: number, data: {
    first_name: string; last_name: string; username: string;
    phone: string; about: string; clear_photo: boolean
  }) =>
    request(`/api/users/${id}/profile`, { method: 'POST', body: JSON.stringify(data) }),

  changeID: (id: number, new_id: number) =>
    request<{ ok: string; old_id: number; new_id: number }>(
      `/api/users/${id}/change-id`,
      { method: 'POST', body: JSON.stringify({ new_id }) }
    ),

  bulkFlags: (ids: number[], flags: Partial<UserFlags>) =>
    request<{ ok: string; updated: number }>('/api/users/bulk-flags', {
      method: 'POST',
      body: JSON.stringify({ ids, flags }),
    }),

  bots: () => request<BotList>('/api/bots'),

  createBot: (data: CreateBotRequest) =>
    request<{ id: number; token: string }>('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteBot: (id: number) => request(`/api/bots/${id}/delete`, { method: 'POST' }),
}
