import { useCallback, useRef, useState } from 'react'

interface ToastState {
  message: string
  tone: 'success' | 'error'
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  return { toast, show }
}

export function ToastView({ toast }: { toast: { message: string; tone: 'success' | 'error' } | null }) {
  if (!toast) return null
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
        toast.tone === 'success' ? 'bg-app-accent' : 'bg-app-error'
      }`}
    >
      {toast.message}
    </div>
  )
}
