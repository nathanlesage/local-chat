import { DateTime, Duration } from 'luxon'

/**
 * Formats a date (must be provided as JavaScript Date number in milliseconds)
 *
 * @param   {number}  date      The Date timestamp
 * @param   {string}  type      The type of formatting (only when
 *                              `relative === false`; can be date, time, or
 *                              datetime).
 * @param   {boolean} relative  Whether the format should be relative (to
 *                              `Date.now()`), or absolute.
 * @param   {boolean} long      Whether to use a long date string
 *
 * @return  {string}            The formatted, human-readable date.
 */
export function formatDate (
  date: number,
  type: 'date'|'time'|'datetime',
  relative: boolean = false,
  long: boolean = false
): string {
  const dt = DateTime.fromMillis(date)
  const style = long ? 'long' : 'short'
  if (relative) {
    return dt.toRelative({ style, locale: 'en-US' }) ?? date.toString()
  } else if (type === 'date') {
    return dt.toLocaleString({ dateStyle: style })
  } else if (type === 'time') {
    return dt.toLocaleString({ timeStyle: style })
  } else {
    return dt.toLocaleString({ timeStyle: style, dateStyle: style })
  }
}

/**
 * Formats an amount of seconds into a user-readable string of format mm:ss.
 *
 * @param   {number}  sec  The seconds to format
 *
 * @return  {string}       The formatted number of seconds.
 */
export function formatSeconds (sec: number): string {
  const duration = Duration.fromObject({ seconds: sec })
  return duration.toFormat('mm:ss')
}

/**
 * Formats the generation time during response generation, rounded to one
 * decimal
 *
 * @param   {number}  time  The time in milliseconds
 *
 * @return  {string}        The formatted time in the format `1.2`
 */
export function formatGenerationTime (time: number): string {
  const t = String(Math.round(time / 100) / 10)
  return (!t.includes('.')) ? `${t}.0` : t
}
