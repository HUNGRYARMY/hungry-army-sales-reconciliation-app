import { useEffect } from 'react'

// Restores whatever favicon was set before this component mounted, rather than hardcoding the app
// default — so navigating between apps within one session (e.g. founder visiting Commissary) always
// leaves the favicon matching whichever app is actually on screen.
export function useFavicon(href: string) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const previous = link.href
    link.href = href
    return () => {
      link.href = previous
    }
  }, [href])
}
