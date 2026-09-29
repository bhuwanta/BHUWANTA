/** Preserve the PDF viewer while allowing only explicit HTTPS document links. */
export function documentDownloadHref(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.pathname.toLowerCase().endsWith('.pdf')
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url.href)}`
      : url.href
  } catch {
    return null
  }
}
