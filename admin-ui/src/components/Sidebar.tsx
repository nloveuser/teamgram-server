'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './SidebarContext'

const NAV = [
  { href: '/dashboard/', icon: '▦',  label: 'Dashboard', section: 'Overview' },
  { href: '/users/',     icon: '👥', label: 'Users',      section: 'Management' },
  { href: '/chats/',     icon: '💬', label: 'Chats',      section: 'Management' },
  { href: '/bots/',      icon: '🤖', label: 'Bots',       section: 'Management' },
  { href: '/system/',    icon: '⚙️', label: 'System',     section: 'Infrastructure' },
]

const sections = Array.from(new Set(NAV.map(n => n.section)))

export default function Sidebar() {
  const path = usePathname()
  const { open, close } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      <aside className={[
        'fixed top-0 left-0 bottom-0 w-64 bg-surface border-r border-border',
        'flex flex-col z-50 transition-transform duration-200',
        // desktop: always visible; mobile: slide in/out
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 bg-accent/15 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
            ✈️
          </div>
          <span className="text-[15px] font-bold text-tx">TG Admin</span>
          <span className="ml-auto text-[10px] font-semibold bg-accent/10 text-accent rounded px-1.5 py-0.5">
            v1.0
          </span>
          {/* Close button on mobile */}
          <button onClick={close} className="lg:hidden ml-1 text-muted hover:text-tx text-xl leading-none">×</button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {sections.map(sec => (
            <div key={sec}>
              <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                {sec}
              </div>
              <ul className="px-2">
                {NAV.filter(n => n.section === sec).map(n => {
                  const active = path.startsWith(n.href.slice(0, -1))
                  return (
                    <li key={n.href}>
                      <Link href={n.href} onClick={close}
                        className={[
                          'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all',
                          active ? 'bg-accent/12 text-accent font-semibold' : 'text-muted hover:bg-surface2 hover:text-tx',
                        ].join(' ')}>
                        <span className="w-5 text-center text-base">{n.icon}</span>
                        {n.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3.5 border-t border-border flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-ok shadow-[0_0_0_3px_rgba(63,185,80,.2)] flex-shrink-0" />
          Connected
        </div>
      </aside>
    </>
  )
}
