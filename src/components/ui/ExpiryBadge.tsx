import { getExpiryStatus, formatDDay } from '@/lib/utils'

interface ExpiryBadgeProps {
  expiryDate: string
  size?: 'sm' | 'md'
}

// 유통기한 배지 컴포넌트
export default function ExpiryBadge({ expiryDate, size = 'md' }: ExpiryBadgeProps) {
  if (!expiryDate) return null

  const status = getExpiryStatus(expiryDate)
  const dday = formatDDay(expiryDate)

  const colorMap = {
    urgent: 'bg-red-100 text-red-600 border-red-200',
    caution: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    safe: 'bg-green-100 text-green-600 border-green-200',
  }

  const sizeMap = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  }

  return (
    <span
      className={`inline-block border rounded-full font-semibold ${colorMap[status]} ${sizeMap[size]}`}
    >
      {dday}
    </span>
  )
}
