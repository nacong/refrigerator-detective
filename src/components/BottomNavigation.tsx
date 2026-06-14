'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AddIngredientSheet from '@/components/AddIngredientSheet'
import { useAppStore } from '@/store/useAppStore'

/**
 * BottomNavigation — 모바일 하단 고정 네비게이션.
 * 5개 아이콘: 홈 / 냉장고 / 카메라(중앙 FAB) / 레시피 / 마이페이지.
 */

type NavKey = 'home' | 'fridge' | 'camera' | 'recipe' | 'mypage'

interface BottomNavigationProps {
  active?: NavKey
}

const ROUTES: Record<NavKey, string> = {
  home: '/',
  fridge: '/rescue-list',
  camera: '/ai-recognition',
  recipe: '/cooking-history',
  mypage: '/settings',
}

function inferActive(pathname: string | null): NavKey {
  if (!pathname || pathname === '/') return 'home'
  if (pathname.startsWith('/rescue-list')) return 'fridge'
  if (pathname.startsWith('/ai-recognition')) return 'camera'
  if (pathname.startsWith('/cooking-history')) return 'recipe'
  if (pathname.startsWith('/settings') || pathname.startsWith('/mypage')) return 'mypage'
  return 'home'
}

export default function BottomNavigation({ active }: BottomNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const current = active ?? inferActive(pathname)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const setFloatingButtonHidden = useAppStore((s) => s.setFloatingButtonHidden)
  const setCapturedImage = useAppStore((s) => s.setCapturedImage)

  useEffect(() => { setFloatingButtonHidden(showAddSheet) }, [showAddSheet, setFloatingButtonHidden])

  const go = (key: NavKey) => router.push(ROUTES[key])

  return (
    <>
    <nav
      aria-label="주요 화면 이동"
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none"
    >
      <div
        className="mx-auto pointer-events-auto w-full"
        style={{
          maxWidth: 430,
          padding: `0 12px calc(8px + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative bg-white rounded-2xl border border-gray-100 px-2 pt-2 pb-2 grid grid-cols-5 items-center"
          style={{
            minHeight: 56,
            boxShadow: '0 -2px 24px rgba(17,24,39,0.08)',
          }}
        >
          <IconButton ariaLabel="홈" active={current === 'home'} onClick={() => go('home')}>
            <HomeIcon />
          </IconButton>

          <IconButton ariaLabel="냉장고" active={current === 'fridge'} onClick={() => go('fridge')}>
            <FridgeIcon />
          </IconButton>

          {/* 가운데 FAB */}
          <div className="flex items-start justify-center">
            <button
              type="button"
              aria-label="식재료 추가"
              onClick={() => setShowAddSheet(true)}
              className="w-12 h-12 rounded-full bg-[#13AF70] text-white inline-flex items-center justify-center active:scale-95 transition-transform"
              style={{
                marginTop: -20,
                boxShadow: '0 6px 16px rgba(19,175,112,0.35)',
                border: '4px solid #fff',
              }}
            >
              <CameraIcon />
            </button>
          </div>

          <IconButton ariaLabel="레시피" active={current === 'recipe'} onClick={() => go('recipe')}>
            <RecipeIcon />
          </IconButton>

          <IconButton ariaLabel="마이페이지" active={current === 'mypage'} onClick={() => go('mypage')}>
            <UserIcon />
          </IconButton>
        </div>
      </div>
    </nav>

    {showAddSheet && (
      <AddIngredientSheet
        onClose={() => setShowAddSheet(false)}
        onFileSelected={(base64, mime) => {
          setCapturedImage(base64, mime)
          setShowAddSheet(false)
          router.push('/ai-recognition?autostart=true')
        }}
        onManual={() => { setShowAddSheet(false); router.push('/ai-recognition?action=manual') }}
      />
    )}
    </>
  )
}

interface IconButtonProps {
  ariaLabel: string
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}
function IconButton({ ariaLabel, active, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`w-10 h-10 mx-auto rounded-xl inline-flex items-center justify-center active:scale-95 transition-transform ${
        active ? 'text-[#13AF70]' : 'text-gray-400'
      }`}
    >
      {children}
    </button>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" />
    </svg>
  )
}
function FridgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <line x1="5" y1="10" x2="19" y2="10" />
      <line x1="8" y1="6.5" x2="8" y2="8" />
      <line x1="8" y1="13" x2="8" y2="16" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-2.5h6L17 8h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  )
}
function RecipeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h11a2 2 0 012 2v14H8a2 2 0 01-2-2V4z" />
      <path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  )
}
