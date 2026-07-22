import { formatInTimeZone } from 'date-fns-tz'

// Business day is plain midnight-to-midnight Asia/Manila local time (confirmed: no branch operates past
// midnight). Computed explicitly rather than relying on the device's own clock/timezone, since a tablet or
// a founder's laptop could be misconfigured or simply not in the Philippines.
export const BUSINESS_TIMEZONE = 'Asia/Manila'

export function getBusinessDate(): string {
  return formatInTimeZone(new Date(), BUSINESS_TIMEZONE, 'yyyy-MM-dd')
}
