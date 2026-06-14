'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import BottomNavigation from '@/components/BottomNavigation'
import { useIngredients, useDeleteIngredient } from '@/hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'
import type { Ingredient, IngredientLocation, IngredientCategory } from '@/types'
import { CATEGORY_ORDER, CATEGORY_META } from '@/lib/categories'
import { useAppStore } from '@/store/useAppStore'
import AddIngredientSheet from '@/components/AddIngredientSheet'

// ──────────────────────── constants ────────────────────────

const VIEW_MODE_KEY = 'rd_ingredient_view_mode'

const MILESTONES: Record<number, { emoji: string; title: string }> = {
  1:  { emoji: '🌱', title: '첫 냉털 달성!' },
  5:  { emoji: '🥕', title: '냉털 초보 달성!' },
  10: { emoji: '⭐', title: '냉털 달인 달성!' },
  20: { emoji: '🏆', title: '냉털 전문가 달성!' },
  50: { emoji: '👑', title: '냉털 마스터 달성!' },
}

const LOCATIONS: { key: IngredientLocation; icon: string; label: string }[] = [
  { key: '냉장실', icon: '❄️', label: '냉장실' },
  { key: '냉동실', icon: '🧊', label: '냉동실' },
  { key: '실온',   icon: '🗄️', label: '실온 보관' },
]

// ──────────────────────── helpers ────────────────────────

function attachParticle(text: string): string {
  const code = text[text.length - 1]?.charCodeAt(0) ?? 0
  if (code < 0xAC00 || code > 0xD7A3) return text + '가'
  return (code - 0xAC00) % 28 !== 0 ? text + '이' : text + '가'
}

function formatIngredientCta(names: string[]): string {
  const displayText =
    names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}개`
  return `${attachParticle(displayText)} 포함된 레시피 만들기`
}

function daysUntilExpiry(expiryDate: string | undefined | null): number | null {
  if (!expiryDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(expiryDate); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function isExpiredIngredient(ing: Ingredient): boolean {
  const d = daysUntilExpiry(ing.expiryDate)
  return d !== null && d < 0
}

function parseQuantityValue(quantity: string): number {
  const m = quantity.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

// ──────────────────────── page ────────────────────────

interface ToastItem { id: number; name: string; count: number; isMilestone: boolean }

export default function RescueListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: ingredients = [], isLoading } = useIngredients()
  const deleteIngredient = useDeleteIngredient()

  const [viewMode, setViewMode] = useState<'all' | 'category'>(() => {
    try { return localStorage.getItem(VIEW_MODE_KEY) === 'category' ? 'category' : 'all' }
    catch { return 'all' }
  })
  const setView = (m: 'all' | 'category') => {
    setViewMode(m)
    try { localStorage.setItem(VIEW_MODE_KEY, m) } catch { /* ignore */ }
  }

  const [sort, setSort] = useState<'expiry' | 'quantity'>('expiry')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [discardTarget, setDiscardTarget] = useState<Ingredient | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editLocation, setEditLocation] = useState<IngredientLocation>('냉장실')
  const [editCategory, setEditCategory] = useState<IngredientCategory>('기타')
  const [editExpiryDate, setEditExpiryDate] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const setFloatingButtonHidden = useAppStore((s) => s.setFloatingButtonHidden)
  const setCapturedImage = useAppStore((s) => s.setCapturedImage)
  const setPendingChat = useAppStore((s) => s.setPendingChat)

  // 플로팅 버튼: 시트 열리거나 재료 선택 시 숨김
  useEffect(() => {
    setFloatingButtonHidden(showAddSheet || selectedIds.size > 0)
  }, [showAddSheet, selectedIds, setFloatingButtonHidden])
  useEffect(() => () => { setFloatingButtonHidden(false) }, [setFloatingButtonHidden])

  const sorted = useMemo(() => {
    const expired = ingredients.filter(isExpiredIngredient)
      .sort((a, b) => (daysUntilExpiry(a.expiryDate) ?? 0) - (daysUntilExpiry(b.expiryDate) ?? 0))
    const active = ingredients.filter((i) => !isExpiredIngredient(i))
    if (sort === 'expiry') {
      active.sort((a, b) => {
        const aN = daysUntilExpiry(a.expiryDate) ?? Infinity
        const bN = daysUntilExpiry(b.expiryDate) ?? Infinity
        return aN - bN
      })
    } else {
      active.sort((a, b) => parseQuantityValue(b.quantity) - parseQuantityValue(a.quantity))
    }
    return [...expired, ...active]
  }, [ingredients, sort])

  const selectedItems = useMemo(
    () => ingredients.filter((i) => selectedIds.has(i.id)),
    [ingredients, selectedIds]
  )

  const showToast = (toast: ToastItem) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 2800)
  }

  const handleDelete = (ingredient: Ingredient) => {
    deleteIngredient.mutate(ingredient.id, {
      onSuccess: async () => {
        try {
          const res = await fetch('/api/supabase/user-stats', { method: 'POST' })
          if (res.ok) {
            const { cleared_count } = await res.json()
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
            showToast({ id: Date.now(), name: ingredient.name, count: cleared_count, isMilestone: !!MILESTONES[cleared_count] })
          }
        } catch { /* ignore */ }
        setSelectedIds((s) => { const next = new Set(s); next.delete(ingredient.id); return next })
      },
    })
  }

  const handleDiscardConfirm = () => {
    if (!discardTarget) return
    handleDelete(discardTarget)
    setDiscardTarget(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleCardClick = (ing: Ingredient) => {
    if (isExpiredIngredient(ing)) setDiscardTarget(ing)
    else toggleSelect(ing.id)
  }

  const handleCardLongPress = (ing: Ingredient) => {
    openEdit(ing)
  }

  const openEdit = (ingredient: Ingredient) => {
    setEditTarget(ingredient)
    setEditName(ingredient.name)
    setEditEmoji(ingredient.emoji)
    setEditQuantity(ingredient.quantity)
    setEditLocation(ingredient.location ?? '냉장실')
    setEditCategory(ingredient.category ?? '기타')
    setEditExpiryDate(ingredient.expiryDate ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setIsSavingEdit(true)
    try {
      await fetch('/api/supabase/ingredients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTarget.id,
          name: editName,
          emoji: editEmoji,
          quantity: editQuantity,
          location: editLocation,
          category: editCategory,
          expiryDate: editExpiryDate,
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    } catch { /* ignore */ } finally {
      setIsSavingEdit(false)
      setEditTarget(null)
    }
  }

  return (
    <MobileContainer fullHeight>
      <header
        className="px-4 pb-3 border-b border-gray-100 flex-shrink-0"
        style={{ paddingTop: 'max(32px, calc(env(safe-area-inset-top) + 16px))' }}
      >
        <h1 className="text-[22px] font-bold text-gray-900">나의 식재료</h1>
      </header>

      <div
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ padding: selectedItems.length > 0 ? '14px 16px 168px' : '14px 16px 110px' }}
      >
        {/* Count + Sort */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13.5px] text-gray-500 m-0">
            <b className="text-gray-800 font-bold">{ingredients.length}종</b> 보관 중
          </p>
          <SortMenu sort={sort} setSort={setSort} />
        </div>

        {/* View mode toggle */}
        <ViewModeToggle value={viewMode} onChange={setView} />

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2.5 mt-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[124px] bg-gray-100 rounded-[14px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-3.5">
            {viewMode === 'all' ? (
              <div className="grid grid-cols-3 gap-2.5">
                {sorted.map((ing) => (
                  <InventoryCard
                    key={ing.id}
                    ingredient={ing}
                    expired={isExpiredIngredient(ing)}
                    selected={selectedIds.has(ing.id)}
                    onClick={() => handleCardClick(ing)}
                    onLongPress={() => handleCardLongPress(ing)}
                    onEdit={() => openEdit(ing)}
                    onDelete={() => handleDelete(ing)}
                  />
                ))}
                <AddInventoryCard onClick={() => setShowAddSheet(true)} />
              </div>
            ) : (
              <>
                <CategoryAccordion
                  items={ingredients}
                  selectedIds={selectedIds}
                  onCardClick={handleCardClick}
                  onCardLongPress={handleCardLongPress}
                  onCardEdit={openEdit}
                  onDelete={handleDelete}
                />
                <button
                  onClick={() => setShowAddSheet(true)}
                  className="w-full flex items-center justify-center gap-2 mt-3 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-[13.5px] font-semibold text-gray-400 active:opacity-70 transition-opacity"
                >
                  <span className="text-xl leading-none" aria-hidden>+</span> 식재료 추가
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating CTA */}
      {selectedItems.length > 0 && (
        <div
          className="absolute left-0 right-0 z-30 px-4 pointer-events-none"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            className="w-full min-h-[56px] pointer-events-auto flex items-center justify-center bg-[#13AF70] rounded-2xl text-white active:scale-[0.98] transition-transform px-4"
            style={{ boxShadow: '0 8px 20px rgba(19,175,112,.32)' }}
            onClick={() => {
              const names = selectedItems.map((i) => i.name)
              setPendingChat(names, '')
              router.push('/chatbot')
            }}
          >
            <span className="text-[14px] font-bold text-center leading-tight">
              {formatIngredientCta(selectedItems.map((i) => i.name))}
            </span>
          </button>
        </div>
      )}

      <BottomNavigation active="fridge" />

      {/* Discard expired modal */}
      {discardTarget && (
        <DiscardExpiredModal
          ingredient={discardTarget}
          onConfirm={handleDiscardConfirm}
          onClose={() => setDiscardTarget(null)}
        />
      )}

      {/* Add ingredient sheet */}
      {showAddSheet && (
        <AddIngredientSheet
          onClose={() => setShowAddSheet(false)}
          onFileSelected={(base64, mime) => {
            setCapturedImage(base64, mime)
            setShowAddSheet(false)
            router.push('/ai-recognition?autostart=true&from=rescue-list')
          }}
          onManual={() => { setShowAddSheet(false); router.push('/ai-recognition?action=manual&from=rescue-list') }}
        />
      )}

      {/* Edit bottom sheet */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setEditTarget(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-40 px-5 pt-5 max-w-[430px] mx-auto overflow-y-auto no-scrollbar" style={{ maxHeight: '90dvh', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[16px] font-bold text-gray-900">식재료 정보 수정</p>
              {isExpiredIngredient(editTarget) && (
                <button
                  onClick={() => { setDiscardTarget(editTarget); setEditTarget(null) }}
                  className="text-[12px] font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl active:opacity-70"
                >
                  폐기하기
                </button>
              )}
            </div>

            {/* 이모지 + 이름 */}
            <div className="flex gap-2.5 mb-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 mb-1.5">이모지</p>
                <input
                  type="text"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  maxLength={2}
                  className="w-[52px] border border-gray-200 rounded-xl px-2 py-2.5 text-xl text-center outline-none focus:border-[#13AF70]"
                />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-gray-400 mb-1.5">이름</p>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
                />
              </div>
            </div>

            {/* 수량 */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-gray-400 mb-1.5">수량/용량</p>
              <input
                type="text"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="예) 1개, 200g"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#13AF70]"
              />
            </div>

            {/* 유통기한 */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-gray-400 mb-1.5">유통기한</p>
              <input
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#13AF70]"
              />
            </div>

            {/* 보관 위치 */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-gray-400 mb-1.5">보관 위치</p>
              <div className="flex gap-2">
                {LOCATIONS.map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setEditLocation(key)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-colors ${
                      editLocation === key ? 'border-[#13AF70] bg-[#F0FBF5] text-[#13AF70]' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="text-[11px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold text-gray-400 mb-1.5">카테고리</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_ORDER.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEditCategory(cat)}
                    className={`py-2 px-1 rounded-xl border-2 text-[11px] font-medium transition-colors ${
                      editCategory === cat ? 'border-[#13AF70] bg-[#F0FBF5] text-[#13AF70]' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {CATEGORY_META[cat].icon} {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editName.trim()}
              className="w-full bg-[#13AF70] text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {isSavingEdit ? '저장 중...' : '저장하기'}
            </button>
            <button
              onClick={() => { setEditTarget(null); handleDelete(editTarget!) }}
              className="w-full py-3 text-red-400 text-[13px] font-semibold active:opacity-70 transition-opacity"
            >
              삭제하기
            </button>
          </div>
        </>
      )}

      {/* Toasts */}
      <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 px-6 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.isMilestone ? 'bg-[#13AF70] text-white' : 'bg-gray-900 text-white'
            }`}
          >
            <span className="text-xl flex-shrink-0">
              {toast.isMilestone ? MILESTONES[toast.count]?.emoji : '🧹'}
            </span>
            <div className="flex-1 min-w-0">
              {toast.isMilestone ? (
                <>
                  <p className="text-[13px] font-bold leading-tight">{MILESTONES[toast.count]?.title}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">냉털 {toast.count}개 돌파! 대단해요 🎉</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold leading-tight">{toast.name} 냉털 완료!</p>
                  <p className="text-[11px] opacity-60 mt-0.5">총 {toast.count}개 처리했어요</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </MobileContainer>
  )
}

// ──────────────────────── ViewModeToggle ────────────────────────

function ViewModeToggle({
  value,
  onChange,
}: {
  value: 'all' | 'category'
  onChange: (m: 'all' | 'category') => void
}) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
      {(['all', 'category'] as const).map((mode) => {
        const active = value === mode
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`flex-1 h-[34px] rounded-[9px] text-[13px] transition-all duration-150 ${
              active ? 'bg-white text-[#13AF70] font-bold shadow-sm' : 'text-gray-400 font-medium'
            }`}
          >
            {mode === 'all' ? '전체 보기' : '카테고리 보기'}
          </button>
        )
      })}
    </div>
  )
}

// ──────────────────────── SortMenu ────────────────────────

function SortMenu({
  sort,
  setSort,
}: {
  sort: 'expiry' | 'quantity'
  setSort: (s: 'expiry' | 'quantity') => void
}) {
  const [open, setOpen] = useState(false)
  const options: { key: 'expiry' | 'quantity'; label: string }[] = [
    { key: 'expiry',   label: '기한임박순' },
    { key: 'quantity', label: '양이 많은순' },
  ]
  const current = options.find((o) => o.key === sort)!

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[12.5px] font-medium text-gray-500"
      >
        {current.label}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-30" />
          <div
            className="absolute top-[calc(100%+6px)] right-0 z-40 bg-white border border-gray-200 rounded-xl overflow-hidden min-w-[132px]"
            style={{ boxShadow: '0 8px 24px rgba(17,24,39,.08)' }}
          >
            {options.map((opt) => {
              const active = opt.key === sort
              return (
                <button
                  key={opt.key}
                  onClick={() => { setSort(opt.key); setOpen(false) }}
                  className={`w-full px-3.5 py-2.5 text-left text-[13px] flex items-center justify-between gap-2 ${
                    active ? 'bg-[#E8F9F1] text-[#0E8F5B] font-semibold' : 'bg-white text-gray-700 font-medium'
                  }`}
                >
                  {opt.label}
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#0E8F5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ──────────────────────── ExpiryByDays ────────────────────────

function ExpiryByDays({ days }: { days: number }) {
  let bg: string, fg: string, bd: string, label: string
  if (days < 0) {
    bg = '#EDE3FF'; fg = '#6B4FCB'; bd = '#B9A4F2'; label = `D+${Math.abs(days)}`
  } else if (days === 0) {
    bg = '#FEE2E2'; fg = '#DC2626'; bd = '#FECACA'; label = 'D-day'
  } else if (days <= 3) {
    bg = '#FEE2E2'; fg = '#DC2626'; bd = '#FECACA'; label = `D-${days}`
  } else if (days <= 7) {
    bg = '#FEF3C7'; fg = '#D97706'; bd = '#FDE68A'; label = `D-${days}`
  } else {
    bg = '#DCFCE7'; fg = '#16A34A'; bd = '#BBF7D0'; label = `D-${days}`
  }
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '.02em',
      color: fg, background: bg, border: `1.5px solid ${bd}`,
      borderRadius: 9999, padding: '2px 8px', whiteSpace: 'nowrap', lineHeight: 1.2,
    }}>
      {label}
    </span>
  )
}

// ──────────────────────── InventoryCard ────────────────────────
// Long press (600ms) opens edit sheet. Short tap = select / open discard modal.

function InventoryCard({
  ingredient,
  expired,
  selected,
  onClick,
  onLongPress,
  onEdit,
  onDelete,
}: {
  ingredient: Ingredient
  expired: boolean
  selected: boolean
  onClick: () => void
  onLongPress: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const days = daysUntilExpiry(ingredient.expiryDate)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHold = useRef(false)

  const startHold = () => {
    didHold.current = false
    holdTimer.current = setTimeout(() => {
      didHold.current = true
      onLongPress()
    }, 600)
  }
  const endHold = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
  }
  const handleClick = () => {
    if (didHold.current) { didHold.current = false; return }
    onClick()
  }

  const palette = expired
    ? { bg: '#F3EEFF', bd: '#B9A4F2', text: '#6B4FCB', meta: '#8B72D8' }
    : selected
    ? { bg: '#E8F9F1', bd: '#13AF70', text: '#0E8F5B', meta: '#0E8F5B' }
    : { bg: '#fff',    bd: '#E5E7EB', text: '#374151', meta: '#9CA3AF' }

  return (
    <button
      type="button"
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onClick={handleClick}
      style={{
        position: 'relative', cursor: 'pointer', fontFamily: 'inherit',
        background: palette.bg, border: `1px solid ${palette.bd}`, borderRadius: 14,
        padding: '12px 8px 10px', minHeight: 124,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        transition: 'background 150ms ease, border-color 150ms ease',
        boxShadow: expired
          ? '0 1px 2px rgba(123,92,214,.16)'
          : selected
          ? '0 1px 2px rgba(19,175,112,.18)'
          : '0 1px 2px rgba(0,0,0,.05)',
        width: '100%',
      }}
    >
      {/* 좌상단 수정 버튼 */}
      {!expired && (
        <span
          role="button"
          aria-label={`${ingredient.name} 수정`}
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEdit() } }}
          style={{
            position: 'absolute', top: 4, left: 4, width: 20, height: 20,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 9999, background: '#F3F4F6', color: '#9CA3AF',
            cursor: 'pointer',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>
      )}

      {/* 우상단: 만료=! / 선택=체크 / 일반=X 삭제 */}
      {expired ? (
        <span aria-hidden style={{
          position: 'absolute', top: 6, right: 6, width: 20, height: 20,
          borderRadius: 9999, background: '#7B5CD6', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, lineHeight: 1,
        }}>!</span>
      ) : selected ? (
        <span aria-hidden style={{
          position: 'absolute', top: 6, right: 6, width: 20, height: 20,
          borderRadius: 9999, background: '#13AF70', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      ) : (
        <span
          role="button"
          aria-label={`${ingredient.name} 삭제`}
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDelete() } }}
          style={{
            position: 'absolute', top: 4, right: 4, width: 20, height: 20,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 9999, background: 'transparent', color: '#D1D5DB',
            cursor: 'pointer', fontSize: 11, lineHeight: 1,
          }}
        >✕</span>
      )}

      <span style={{
        fontSize: 30, lineHeight: 1, marginTop: 2,
        filter: expired ? 'grayscale(.35)' : 'none',
      }}>
        {ingredient.emoji}
      </span>

      <p style={{
        fontSize: 12.5, fontWeight: 600, color: palette.text,
        margin: '2px 0 0', textAlign: 'center', width: '100%',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {ingredient.name}
      </p>

      <p style={{ fontSize: 11, color: palette.meta, margin: 0 }}>{ingredient.quantity}</p>

      {days !== null ? (
        <ExpiryByDays days={days} />
      ) : (
        <span style={{
          display: 'inline-block', fontSize: 10.5, fontWeight: 600,
          color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB',
          borderRadius: 9999, padding: '1px 8px', whiteSpace: 'nowrap',
        }}>날짜 없음</span>
      )}
    </button>
  )
}

// ──────────────────────── AddInventoryCard ────────────────────────

function AddInventoryCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="식재료 추가"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, background: 'transparent',
        border: '2px dashed #E5E7EB', borderRadius: 14,
        padding: 12, minHeight: 124, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
      }}
    >
      <span aria-hidden style={{
        width: 32, height: 32, borderRadius: 9999, background: '#F3F4F6',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#9CA3AF', fontSize: 20, lineHeight: 1,
      }}>+</span>
      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>식재료 추가</span>
    </button>
  )
}

// ──────────────────────── CategoryAccordion ────────────────────────

function CategoryAccordion({
  items,
  selectedIds,
  onCardClick,
  onCardLongPress,
  onCardEdit,
  onDelete,
}: {
  items: Ingredient[]
  selectedIds: Set<string>
  onCardClick: (ing: Ingredient) => void
  onCardLongPress: (ing: Ingredient) => void
  onCardEdit: (ing: Ingredient) => void
  onDelete: (ing: Ingredient) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORY_ORDER.map((cat) => [cat, true]))
  )

  const groups = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: items
        .filter((i) => (i.category ?? '기타') === cat)
        .sort((a, b) => {
          const aN = daysUntilExpiry(a.expiryDate) ?? Infinity
          const bN = daysUntilExpiry(b.expiryDate) ?? Infinity
          return aN - bN
        }),
    }))
  }, [items])

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ cat, items: catItems }) => {
        const isCollapsed = collapsed[cat] ?? false
        const { icon } = CATEGORY_META[cat]
        return (
          <div key={cat} className={`border rounded-2xl overflow-hidden ${catItems.length > 0 ? 'bg-[#F0FBF5] border-[#B6EDD4]' : 'bg-gray-50 border-gray-200'}`}>
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              className="w-full flex items-center justify-between px-4 py-3 active:opacity-70"
            >
              <div className="flex items-center gap-2">
                <span className={`text-base ${catItems.length === 0 ? 'opacity-40' : ''}`}>{icon}</span>
                <span className={`text-[14px] font-bold ${catItems.length > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{cat}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${catItems.length > 0 ? 'text-[#13AF70] bg-white border-[#B6EDD4]' : 'text-gray-400 bg-white border-gray-200'}`}>
                  {catItems.length}개
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {!isCollapsed && (
              <div className="px-3 pb-3">
                {catItems.length === 0 ? (
                  <p className="text-center text-[12px] text-gray-300 py-4">없음</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {catItems.map((ing) => (
                      <InventoryCard
                        key={ing.id}
                        ingredient={ing}
                        expired={isExpiredIngredient(ing)}
                        selected={selectedIds.has(ing.id)}
                        onClick={() => onCardClick(ing)}
                        onLongPress={() => onCardLongPress(ing)}
                        onEdit={() => onCardEdit(ing)}
                        onDelete={() => onDelete(ing)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────── DiscardExpiredModal ────────────────────────

function DiscardExpiredModal({
  ingredient,
  onConfirm,
  onClose,
}: {
  ingredient: Ingredient
  onConfirm: () => void
  onClose: () => void
}) {
  const days = daysUntilExpiry(ingredient.expiryDate)
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-7"
      style={{ background: 'rgba(17,24,39,.45)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full bg-white flex flex-col items-center gap-3"
        style={{ maxWidth: 320, borderRadius: 22, padding: '20px 22px 22px', boxShadow: '0 20px 40px rgba(17,24,39,.25)' }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 text-base active:bg-gray-100"
        >✕</button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/detective_warning.png"
          alt="냉탐이의 경고"
          draggable={false}
          className="w-[132px] h-[132px] object-contain mt-2"
        />

        <p className="m-0 text-[14px] font-semibold leading-relaxed text-gray-800 text-center break-keep">
          해당 재료는 소비기한이 만료되었습니다.<br />폐기해주세요!
        </p>

        <p className="m-0 text-[11.5px] text-gray-400 text-center">
          {ingredient.emoji} {ingredient.name} · D+{days !== null ? Math.abs(days) : '?'}
        </p>

        <button
          onClick={onConfirm}
          className="w-full mt-1.5 h-12 text-white text-[14px] font-bold rounded-[14px] active:opacity-90 transition-opacity"
          style={{ background: '#7B5CD6', boxShadow: '0 4px 12px rgba(123,92,214,.32)' }}
        >
          폐기완료
        </button>
      </div>
    </div>
  )
}
