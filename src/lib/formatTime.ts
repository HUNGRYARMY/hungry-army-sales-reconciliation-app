import { formatInTimeZone } from 'date-fns-tz'
import { BUSINESS_TIMEZONE } from './businessDate'

// Postgres `time` values come back as "HH:MM:SS" (24-hour). Display-only formatting to 12-hour + AM/PM —
// the underlying stored value and the <input type="time"> editor stay 24-hour (that's the HTML spec's
// required value format; the browser's own picker UI localizes its display independently of this).
export function formatTime12h(time: string | null): string {
  if (!time) return '—'
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

// timestamptz values (e.g. deliveries.delivery_time) to a 12-hour Asia/Manila clock time for display.
export function formatTimestampTime(timestamp: string): string {
  return formatInTimeZone(new Date(timestamp), BUSINESS_TIMEZONE, 'h:mm a')
}
