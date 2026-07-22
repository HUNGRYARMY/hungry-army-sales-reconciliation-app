import type { ReactNode } from 'react'
import { Header } from './Header'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-app-text">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
