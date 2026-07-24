import { useEffect } from 'react'

// Restores whatever favicon/touch-icon was set before this component mounted, rather than
// hardcoding the app default — so navigating between apps within one session (e.g. founder
// visiting Commissary) always leaves the icons matching whichever app is actually on screen.
export function useFavicon(href: string) {
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    const previousIcon = icon?.href
    const previousTouchIcon = touchIcon?.href
    if (icon) icon.href = href
    if (touchIcon) touchIcon.href = href
    return () => {
      if (icon && previousIcon) icon.href = previousIcon
      if (touchIcon && previousTouchIcon) touchIcon.href = previousTouchIcon
    }
  }, [href])
}
