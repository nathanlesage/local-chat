/**
 * Formats a number according to the en-US locale.
 *
 * @param   {number}  num  The number, e.g., 8192.
 *
 * @return  {string}       The formatted number, e.g., 8,192.
 */
export function formatNumber (num: number): string {
  const formatter = new Intl.NumberFormat('en-US')
  return formatter.format(num)
}
