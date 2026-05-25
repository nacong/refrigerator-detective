import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Providers from '@/components/layout/Providers'

const pretendard = localFont({
  src: '../fonts/pretendard/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  title: '냉장고 탐정',
  description: '냉장고 속 재료로 오늘의 레시피를 찾아드려요!',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className={pretendard.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
