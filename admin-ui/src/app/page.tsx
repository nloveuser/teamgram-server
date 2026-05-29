'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Root() {
  const router = useRouter()
  useEffect(() => {
    const tok = localStorage.getItem('tg_tok')
    router.replace(tok ? '/dashboard/' : '/login/')
  }, [router])
  return null
}
