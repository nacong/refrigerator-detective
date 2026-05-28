'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import { useAppStore } from '@/store/useAppStore'
import { getCoupangSearchUrl } from '@/lib/coupang'

const IMAGE_H = 280

export default function RecipeDetailPage() {
  const router = useRouter()
  const recipe = useAppStore((s) => s.selectedRecipe)

  if (!recipe) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-400">레시피를 찾을 수 없어요.</p>
          <button onClick={() => router.back()} className="text-sm text-[#13AF70] font-medium">
            돌아가기
          </button>
        </div>
      </MobileContainer>
    )
  }

  const ingredients = recipe.ingredientsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // 수량/단위 제거 — "달걀 2개" → "달걀", "간장 1큰술" → "간장"
  const extractName = (ing: string) => ing.replace(/\s+[\d½⅓⅔¼¾].*$/, '').trim()

  return (
    <MobileContainer fullHeight>
      {/* 이미지 — 뒤에 고정 */}
      <div className="absolute inset-x-0 top-0" style={{ height: IMAGE_H }}>
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* 뒤로가기 버튼 — 이미지 위에 고정 */}
      <button
        onClick={() => router.back()}
        className="absolute top-12 left-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm active:bg-white/90"
        aria-label="뒤로가기"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 스크롤 컨테이너 — 전체 화면을 덮으며 이미지 위로 슬라이드 */}
      <div className="absolute inset-0 z-10 overflow-y-auto no-scrollbar pb-28">
        {/* 이미지 높이만큼 투명 spacer */}
        <div style={{ height: IMAGE_H - 24 }} className="flex-shrink-0" />

        {/* 콘텐츠 카드 */}
        <div className="min-h-full bg-white rounded-t-3xl px-4 pt-6 pb-4 space-y-6">
          {/* 레시피 이름 */}
          <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>

          {/* 메타 정보 */}
          <div className="flex gap-2">
            {recipe.cookingMethod && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {recipe.cookingMethod}
              </span>
            )}
            {recipe.cookTimeMinutes > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {recipe.cookTimeMinutes}분
              </span>
            )}
          </div>

          {/* 재료 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-gray-800">재료</h3>
              <span className="flex items-center gap-1 text-[12px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
재료 클릭하면 <span className="font-black text-[#C00] tracking-tight">쿠팡</span>으로 바로 이동
              </span>
            </div>
            <div className="grid grid-cols-2 rounded-2xl overflow-hidden border border-gray-100">
              {ingredients.map((ing, i) => (
                <a
                  key={ing}
                  href={getCoupangSearchUrl(extractName(ing))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 active:bg-[#FFFBEA] transition-colors
                    ${i % 2 === 0 ? 'border-r border-gray-100' : ''}
                    ${i < ingredients.length - (ingredients.length % 2 === 0 ? 2 : 1) ? 'border-b border-gray-100' : ''}
                  `}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#13AF70] flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{ing}</span>
                </a>
              ))}
            </div>
          </section>

          {/* 조리 순서 */}
          {recipe.steps && recipe.steps.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-800 mb-3">조리 순서</h3>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#13AF70] text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 원본 레시피 링크 */}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-gray-400 hover:text-[#13AF70] transition-colors"
            >
              원본 레시피 보기
            </a>
          )}
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-white border-t border-gray-100 safe-bottom">
        <button
          onClick={() => router.push('/cooking-process')}
          className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform"
        >
          요리 시작하기
        </button>
      </div>
    </MobileContainer>
  )
}
