/**
 * Formats a number (in bytes) into an appropriate, human-readable size value.
 * Supported units: Bytes (B), Kilobytes (KB), Megabytes (MB), and Gigabytes
 * (GB). Rounds to one floating point position. 1 KB = 1.024 B.
 *
 * @param   {number}  bytes  The bytes to convert
 *
 * @return  {string}         A formatted string, e.g., `12.5 KB`.
 */
export function formatSize (bytes: number): string {
  let unit = 'B'
  if (bytes > 1024) {
    bytes /= 1024
    unit = 'KB'
  }
  if (bytes > 1024) {
    bytes /= 1024
    unit = 'MB'
  }
  if (bytes > 1024) {
    bytes /= 1024
    unit = 'GB'
  }

  const roundedSize = Math.round(bytes * 10) / 10

  return `${roundedSize} ${unit}`
}
