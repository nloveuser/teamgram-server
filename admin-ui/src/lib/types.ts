export interface Stats {
  total_users: number
  deleted_users: number
  bot_users: number
  premium_users: number
  total_chats: number
  total_messages: number
}

export interface User {
  id: number
  first_name: string
  last_name: string
  username: string
  phone: string
  about: string
  is_bot: boolean
  premium: boolean
  verified: boolean
  scam: boolean
  fake: boolean
  support: boolean
  restricted: boolean
  restriction_reason: string
  color: number
  profile_color: number
  photo_id: number
  deleted: boolean
  state: number
  date2: number
}

export interface UserFlags {
  verified: boolean
  scam: boolean
  fake: boolean
  support: boolean
  premium: boolean
  restricted: boolean
  restriction_reason: string
  color: number          // 0 = default, 1–7 = accent colors
  profile_color: number  // same palette for profile page
}

export interface Bot {
  id: number
  first_name: string
  username: string
  token: string
  bot_type: number
  description: string
  verified: boolean
  date2: number
}

export interface BotList {
  total: number
  items: Bot[]
}

export interface CreateBotRequest {
  first_name: string
  username: string
  description: string
  bot_type: number
}

export interface UserList {
  total: number
  page: number
  items: User[]
}

export interface Chat {
  id: number
  title: string
  about: string
  participant_count: number
  creator_user_id: number
  deactivated: boolean
  date2: number
}

export interface ChatList {
  total: number
  page: number
  items: Chat[]
}

export interface SystemInfo {
  uptime_seconds: number
  goroutines: number
  go_version: string
  os: string
  arch: string
  cpus: number
  heap_alloc_mb: number
  heap_sys_mb: number
  total_alloc_mb: number
  gc_runs: number
  db_open_conns: number
  db_in_use: number
  db_idle: number
}
