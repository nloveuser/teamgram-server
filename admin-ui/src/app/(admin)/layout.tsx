'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('tg_tok')) {
      router.replace('/login/')
    }
  }, [router])

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
