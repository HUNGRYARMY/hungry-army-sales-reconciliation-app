import { useState } from 'react'

// Backs a useState with localStorage so UI state (which tab you're on, etc.) survives a page reload —
// which mobile/tablet browsers routinely do when a backgrounded tab is foregrounded again, discarding
// in-memory React state even though the user never "closed" anything from their point of view.
export function usePersistedState<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return (stored as T) ?? defaultValue
    } catch {
      return defaultValue
    }
  })

  function setPersisted(value: T) {
    setState(value)
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore (private browsing, storage full, etc.) — falls back to in-memory only for this session
    }
  }

  return [state, setPersisted]
}
