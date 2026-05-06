import type { ExpiryStatus } from '@/types'

// 유통기한까지 남은 일수 계산
export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffMs = expiry.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

// D-day 배지 상태 결정
export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const days = getDaysUntilExpiry(expiryDate)
  if (days <= 1) return 'urgent'
  if (days <= 4) return 'caution'
  return 'safe'
}

// D-day 텍스트 포맷
export function formatDDay(expiryDate: string): string {
  const days = getDaysUntilExpiry(expiryDate)
  if (days < 0) return `D+${Math.abs(days)}`
  if (days === 0) return 'D-0'
  return `D-${days}`
}

// 원화 포맷 (예: ₩2,500)
export function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`
}

// 조리 시간 포맷
export function formatCookTime(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}
