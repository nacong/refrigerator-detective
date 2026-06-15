'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useAppStore } from '@/store/useAppStore'
import { getCoupangSearchUrl } from '@/lib/coupang'
import type { ChatMessage, ChatRecipe } from '@/types'

interface ChatBubbleProps {
  message: ChatMessage
}

function RecipeChip({ recipe }: { recipe: ChatRecipe }) {
  const router = useRouter()
  const setSelectedRecipe = useAppStore((s) => s.setSelectedRecipe)

  const handleClick = () => {
    setSelectedRecipe(recipe)
    router.push('/recipe')
  }

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 w-[120px] rounded-[14px] overflow-hidden bg-white border border-gray-200 active:scale-95 transition-transform text-left"
    >
      {recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-[60px] object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-full h-[60px] bg-gradient-to-br from-green-100 to-yellow-100 flex items-center justify-center text-[22px]">🍳</div>
      )}
      <div className="p-2">
        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight">
          {recipe.name}
        </p>
        {recipe.cookTimeMinutes > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">⏱ {recipe.cookTimeMinutes}분</p>
        )}
      </div>
    </button>
  )
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] flex flex-col items-end gap-1.5">
          {/* 선택된 재료 칩 */}
          {message.selectedIngredients && message.selectedIngredients.length > 0 && (
            <div className="relative bg-[#E8F9F1] rounded-2xl rounded-br-[4px] px-3 py-2">
              <div className="flex flex-wrap justify-end gap-1">
                {message.selectedIngredients.map((name) => (
                  <span
                    key={name}
                    className="text-[11px] font-medium text-[#13AF70]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* 메시지 버블 */}
          <div className="bg-[#13AF70] text-white rounded-tl-2xl rounded-tr-[4px] rounded-bl-2xl rounded-br-2xl px-4 py-2.5">
            <p className="text-[13.5px] whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* 말풍선 행 */}
      <div className="flex justify-start items-start gap-2">
        {/* 냉탐이 아바타 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/detective_frontview.png"
          alt="냉탐이"
          width={44}
          height={44}
          className="rounded-[14px] object-cover flex-shrink-0 mt-[6px]"
          style={{ width: 44, height: 44 }}
        />
        <div className="max-w-[80%]">
          {/* 냉탐이 이름 */}
          <p className="text-[11px] font-normal text-gray-500 pl-1 mb-0.5">냉탐이</p>
          {/* AI 말풍선 */}
          <div className="bg-gray-100 rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3">
            <div className="text-[13.5px] text-gray-800 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-headings:my-1 prose-p:my-0.5 prose-li:my-0 prose-strong:text-gray-900 prose-hr:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* 레시피 카드 — 아바타(44)+gap(8)=52px 맞춤 */}
      {message.chatRecipes && message.chatRecipes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 pl-[52px] pb-1">
          {message.chatRecipes.map((recipe) => (
            <RecipeChip key={recipe.name} recipe={recipe} />
          ))}
        </div>
      )}

      {/* 생성 모드 면책 문구 */}
      {message.mode === 'generate' && message.content && (
        <p className="pl-[52px] pt-1.5 text-[11px] text-gray-400 leading-snug">
          ⚠️ AI가 생성한 레시피로, 내용에 오류가 있을 수 있습니다. 조리 전 반드시 확인해 주세요.
        </p>
      )}

      {/* 쿠팡 장보기 버튼 — additionalIngredient 있을 때만 */}
      {message.additionalIngredient && (
        <div className="pl-[52px] pt-2.5">
          <a
            href={getCoupangSearchUrl(message.additionalIngredient)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-3 bg-[#FEE500] rounded-2xl active:opacity-80 transition-opacity shadow-sm"
          >
            {/* 쿠팡 텍스트 로고 */}
            <span className="text-[15px] font-black text-[#C00] tracking-tight leading-none">coupang</span>
            <div className="w-px h-6 bg-yellow-400" />
            <div className="flex flex-col items-start">
              <span className="text-[12px] font-bold text-gray-900 leading-tight">
                {message.additionalIngredient} 바로 구매하기
              </span>
              <span className="text-[10px] text-gray-600 leading-tight mt-0.5">로켓배송 최저가 검색 →</span>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}
