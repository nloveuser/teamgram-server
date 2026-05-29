'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'
import { SidebarProvider } from '@/components/SidebarContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('tg_tok')) {
      router.replace('/login/')
    }
  }, [router])

  return (
    <ToastProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          {/* lg:ml-64 pushes content aside on desktop; on mobile sidebar overlays */}
          <main className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ToastProvider>
  )
}
