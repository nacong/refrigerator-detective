'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ChatBubble from '@/components/chatbot/ChatBubble'
import { useChat } from '@/hooks/useChat'
import { useIngredients } from '@/hooks/useIngredients'
import { useAppStore } from '@/store/useAppStore'

export default function TutorialStep2Page() {
  const router = useRouter()
  const { chatMessages, sendMessage, isLoading } = useChat()
  const { data: ingredients = [] } = useIngredients()
  const clearChatMessages = useAppStore((s) => s.clearChatMessages)

  const [inputText, setInputText] = useState('')
  const [sent, setSent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 이전 채팅 기록 초기화
  useEffect(() => {
    clearChatMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isLoading])

  const hasAnswer = chatMessages.some((m) => m.role === 'assistant')

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || isLoading || sent) return
    setInputText('')
    setSent(true)
    const ingredientNames = ingredients.map((i) => i.name)
    await sendMessage(text, ingredientNames)
  }

  const initialMessage = {
    id: 'tutorial-intro',
    role: 'assistant' as const,
    content: `이제 저에게 뭐든 물어보세요! 🍳\n등록한 식재료로 만들 수 있는\n레시피를 찾아드릴게요.`,
    createdAt: new Date().toISOString(),
  }

  const allMessages = [initialMessage, ...chatMessages]

  return (
    <MobileContainer fullHeight>
      {/* 헤더 — 진행 도트 */}
      <header className="flex items-center justify-between px-4 safe-top pt-4 pb-3 border-b border-gray-100">
        <div className="w-9" />
        <div className="flex gap-1.5">
          <span className="w-6 h-1.5 bg-gray-200 rounded-full" />
          <span className="w-6 h-1.5 bg-[#13AF70] rounded-full" />
        </div>
        <div className="w-9" />
      </header>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {allMessages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* 로딩 점 */}
        {isLoading && (
          <div className="flex items-center gap-2 mt-2 ml-[52px]">
            <div className="flex gap-1 bg-gray-100 rounded-2xl px-4 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 완료 버튼 — 답변 도착 후 */}
        {hasAnswer && !isLoading && (
          <div className="mt-6">
            {/* 냉탐이 마무리 말풍선 */}
            <div className="flex items-end gap-3 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/character.jpg" alt="냉탐이" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              <div className="bg-[#E8F9F1] border border-[#13AF70]/20 rounded-2xl rounded-bl-[4px] px-4 py-3">
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  이제 함께 건강한 식생활을<br />
                  시작해봐요! 언제든 불러주세요 🕵️
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-[#13AF70] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span>🕵️</span>
              <span>냉탐이와 건강한 삶 시작하기</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 — 아직 질문 전에만 표시 */}
      {!sent && (
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 safe-bottom">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="냉탐이에게 물어보세요..."
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#13AF70]"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="w-12 h-12 rounded-2xl bg-[#13AF70] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </MobileContainer>
  )
}
