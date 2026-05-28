/**
 * 쿠팡 파트너스 검색 링크 생성
 * - NEXT_PUBLIC_COUPANG_PARTNER_ID 설정 시 파트너스 트래킹 URL 사용
 * - 미설정 시 일반 쿠팡 검색 URL (파트너스 수수료 없음)
 *
 * 파트너스 가입: https://partners.coupang.com
 */
export function getCoupangSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query)
  const partnerId = process.env.NEXT_PUBLIC_COUPANG_PARTNER_ID

  if (partnerId) {
    // 파트너스 트래킹 URL
    return `https://link.coupang.com/a/${partnerId}?q=${encoded}&channel=user`
  }

  // 파트너 ID 없을 때 — 일반 검색
  return `https://www.coupang.com/np/search?q=${encoded}`
}
