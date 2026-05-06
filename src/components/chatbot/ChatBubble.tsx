'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useAppStore } from '@/store/useAppStore'
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
      className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform text-left"
    >
      {recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-24 object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-3xl">🍳</div>
      )}
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
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
        <div className="max-w-[70%] bg-[#13AF70] text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
          src="/images/character.jpg"
          alt="냉탐이"
          width={28}
          height={28}
          className="rounded-full object-cover flex-shrink-0 self-start mt-1"
        />
        <div className="max-w-[80%]">
          {/* AI 말풍선 — 마크다운 렌더링 */}
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-headings:my-1 prose-p:my-0.5 prose-li:my-0 prose-strong:text-gray-900 prose-hr:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* 레시피 카드 — 전체 너비로 가로 스크롤 */}
      {message.chatRecipes && message.chatRecipes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2 pl-9 pb-1">
          {message.chatRecipes.map((recipe) => (
            <RecipeChip key={recipe.name} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
