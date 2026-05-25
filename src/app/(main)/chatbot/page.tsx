'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import ChatBubble from '@/components/chatbot/ChatBubble'
import { useChat } from '@/hooks/useChat'
import { useIngredients } from '@/hooks/useIngredients'
import type { ChatMessage } from '@/types'

export default function ChatbotPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { chatMessages, sendMessage, isLoading } = useChat()
  const { data: ingredients = [] } = useIngredients()

  const userName = session?.user?.name ?? '고객'
  const initialMessage: ChatMessage = {
    id: 'initial',
    role: 'assistant',
    content: `안녕하세요, ${userName}님 😊\n저에게 의뢰를 주시면\n맞춤 레시피를 추천해 드릴게요!`,
    createdAt: new Date().toISOString(),
  }
  const [inputText, setInputText] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || isLoading) return
    setInputText('')
    await sendMessage(text, selectedIngredients)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const allMessages =
    chatMessages.length === 0 ? [initialMessage] : [initialMessage, ...chatMessages]

  return (
    <MobileContainer fullHeight>
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 safe-top pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-base font-bold text-gray-800">냉탐이의 탐정사무소</h1>
      </header>

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 no-scrollbar">
        {allMessages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start items-start gap-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/detective_frontview.png"
              alt="냉탐이"
              className="rounded-[14px] object-cover flex-shrink-0 mt-[6px]"
              style={{ width: 44, height: 44 }}
            />
            <div>
              <p className="text-[11px] font-normal text-gray-500 pl-1 mb-0.5">냉탐이</p>
              <div className="bg-gray-100 rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-gray-100 px-4 pt-2.5 pb-3 safe-bottom">
        {/* 재료 선택 칩 — Supabase에 등록된 재료 */}
        {ingredients.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {/* 전체 선택 버튼 */}
            <button
              onClick={() => {
                const allNames = ingredients.map((i) => i.name)
                const allSelected = allNames.every((n) => selectedIngredients.includes(n))
                setSelectedIngredients(allSelected ? [] : allNames)
              }}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                ingredients.every((i) => selectedIngredients.includes(i.name))
                  ? 'bg-[#13AF70] text-white border-[#13AF70]'
                  : 'bg-white text-[#13AF70] border-[#13AF70]'
              }`}
            >
              전체
            </button>
            {ingredients.map((ingredient) => {
              const selected = selectedIngredients.includes(ingredient.name)
              return (
                <button
                  key={ingredient.id}
                  onClick={() => toggleIngredient(ingredient.name)}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selected ? 'bg-[#13AF70] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span>{ingredient.emoji}</span>
                  <span>{ingredient.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* 메시지 입력창 */}
        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedIngredients.length > 0
                ? '선택된 재료로 레시피를 물어보세요…'
                : '메시지를 입력하세요…'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
            aria-label="전송"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12l7-7 7 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </MobileContainer>
  )
}
