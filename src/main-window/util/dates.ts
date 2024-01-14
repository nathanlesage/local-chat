import { DateTime } from 'luxon'

/**
 * Formats a date (must be provided as JavaScript Date number in milliseconds)
 *
 * @param   {number}  date      The Date timestamp
 * @param   {string}  type      The type of formatting (only when
 *                              `relative === false`; can be date, time, or
 *                              datetime).
 * @param   {boolean} relative  Whether the format should be relative (to
*                               `Date.now()`), or absolute.
 *
 * @return  {string}            The formatted, human-readable date.
 */
export function formatDate (date: number, type: 'date'|'time'|'datetime', relative: boolean = false): string {
  const dt = DateTime.fromMillis(date)
  if (relative) {
    return dt.toRelative({ style: 'short', locale: 'en-US' }) ?? date.toString()
  } else if (type === 'date') {
    return dt.toLocaleString({ dateStyle: 'short' })
  } else if (type === 'time') {
    return dt.toLocaleString({ timeStyle: 'short' })
  } else {
    return dt.toLocaleString({ timeStyle: 'short', dateStyle: 'short' })
  }
}
