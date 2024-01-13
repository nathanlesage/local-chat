import { DateTime } from 'luxon'

export function formatDate (date: number): string {
  const dt = DateTime.fromMillis(date)
  return dt.toRelative({
    style: 'short',
    locale: 'en-US'
  }) ?? date.toString()
}
