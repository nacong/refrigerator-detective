export function extractYouTubeId(url: string): string {
  const patterns = [
    /youtube\.com\/shorts\/([^?&/]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return ''
}
