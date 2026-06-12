'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import MobileContainer from '@/components/layout/MobileContainer'
import ChatBubble from '@/components/chatbot/ChatBubble'
import { useChat } from '@/hooks/useChat'
import { useIngredients } from '@/hooks/useIngredients'
import type { ChatMessage } from '@/types'
import { CATEGORY_ORDER, CATEGORY_META } from '@/lib/categories'

export default function ChatbotPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { chatMessages, sendMessage, isLoading } = useChat()
  const { data: ingredients = [] } = useIngredients()

  const userName = session?.user?.name ?? '고객'
  const initialMessage: ChatMessage = {
    id: 'initial',
    role: 'assistant',
    content: `안녕하세요, ${userName}님 😊\n저에게 의뢰를 주시면\n맞춤 레시피를 만들어드릴게요!`,
    createdAt: new Date().toISOString(),
  }

  const [inputText, setInputText] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  const [pickerView, setPickerView] = useState<'all' | 'category'>('all')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const plusBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // 재료 로드 시 전체 선택 초기화 (앱 설치 후 최초 1회)
  useEffect(() => {
    if (ingredients.length === 0) return
    if (localStorage.getItem('rd_chatbot_ingredients_initialized')) return
    localStorage.setItem('rd_chatbot_ingredients_initialized', '1')
    setSelectedIngredients(ingredients.map((i) => i.name))
  }, [ingredients])

  // 재료 피커 외부 클릭 시 닫기
  useEffect(() => {
    if (!showIngredientPicker) return
    const handleClick = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        setShowIngredientPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showIngredientPicker])

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || isLoading) return
    setInputText('')
    await sendMessage(text, selectedIngredients, 'generate')
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
              src="/images/detective_thinking.png"
              alt="냉탐이"
              className="rounded-[14px] object-cover flex-shrink-0"
              style={{ width: 56, height: 56, marginTop: 4 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-normal text-gray-500 pl-1 mb-0.5">냉탐이</p>
              <div className="bg-gray-100 rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3.5 max-w-[260px]">
                <p className="text-[13px] font-bold text-gray-700 mb-1">✨ 레시피 제작 중!</p>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
                  재료와 조리 방법을 조합하고 있어요.{'\n'}
                  잠깐만 기다려 주세요 😊
                </p>
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

      {/* 추천 질문 — 스크롤 영역 밖, 입력창 바로 위 좌하단 고정 */}
      {chatMessages.length === 0 && !isLoading && (
        <div className="px-4 pt-2 pb-1 flex flex-col items-start gap-1.5">
          <p className="text-[11px] text-gray-400 pl-1">이런 질문은 어때요?</p>
          {[
            { emoji: '🧹', label: '냉털 레시피 만들어줘.' },
            { emoji: '🛒', label: '재료 하나만 추가하면 만들 수 있는 맛있는 레시피 만들어줘.' },
            { emoji: '🍜', label: '지금 있는 재료로 부타동 만들어먹고 싶어' },
          ].map(({ emoji, label }) => (
            <button
              key={label}
              onClick={() => setInputText(label)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-gray-200 bg-white active:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm flex-shrink-0">{emoji}</span>
              <span className="text-[12px] text-gray-600 leading-snug">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t border-gray-100 px-4 pt-2 pb-3 safe-bottom">

        {/* 메시지 입력창 + 재료 피커 팝업 */}
        <div className="relative">

          {/* 재료 선택 팝업 */}
          {showIngredientPicker && (
            <div
              ref={pickerRef}
              className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 flex flex-col"
              style={{ maxHeight: 320 }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700">재료 선택</p>
                {selectedIngredients.length > 0 && (
                  <button
                    onClick={() => setSelectedIngredients([])}
                    className="text-[11px] text-gray-400 active:text-gray-600"
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* 뷰 토글 */}
              <div className="flex mx-3 mb-2 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
                {(['all', 'category'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setPickerView(v)}
                    className={`flex-1 h-7 rounded-md text-[11.5px] font-medium transition-all ${
                      pickerView === v ? 'bg-white text-[#13AF70] font-bold shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {v === 'all' ? '전체' : '카테고리'}
                  </button>
                ))}
              </div>

              {/* 내용 */}
              <div className="overflow-y-auto no-scrollbar px-3 pb-3">
                {ingredients.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">등록된 재료가 없어요</p>
                ) : pickerView === 'all' ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        const allNames = ingredients.map((i) => i.name)
                        const allSelected = allNames.every((n) => selectedIngredients.includes(n))
                        setSelectedIngredients(allSelected ? [] : allNames)
                      }}
                      className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            selected ? 'bg-[#13AF70] text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span>{ingredient.emoji}</span>
                          <span>{ingredient.name}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {CATEGORY_ORDER.map((cat) => {
                      const catItems = ingredients.filter((i) => (i.category ?? '기타') === cat)
                      if (catItems.length === 0) return null
                      const { icon } = CATEGORY_META[cat]
                      const allCatSelected = catItems.every((i) => selectedIngredients.includes(i.name))
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                              <span>{icon}</span>{cat}
                            </p>
                            <button
                              onClick={() => {
                                const names = catItems.map((i) => i.name)
                                setSelectedIngredients((prev) =>
                                  allCatSelected
                                    ? prev.filter((n) => !names.includes(n))
                                    : Array.from(new Set([...prev, ...names]))
                                )
                              }}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                allCatSelected ? 'bg-[#13AF70] text-white' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              전체
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {catItems.map((ingredient) => {
                              const selected = selectedIngredients.includes(ingredient.name)
                              return (
                                <button
                                  key={ingredient.id}
                                  onClick={() => toggleIngredient(ingredient.name)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                    selected ? 'bg-[#13AF70] text-white' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span>{ingredient.emoji}</span>
                                  <span>{ingredient.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 입력 바 — ChatGPT 스타일: 상단 textarea, 하단 툴바 */}
          <div className="flex flex-col bg-gray-100 rounded-2xl px-3 pt-2.5 pb-2 gap-2">
            {/* 상단: textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedIngredients.length > 0
                  ? `${selectedIngredients.length}개 재료로 레시피를 물어보세요…`
                  : '메시지를 입력하세요…'
              }
              rows={1}
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24"
              style={{ minHeight: '24px' }}
            />

            {/* 하단 툴바: + 버튼 · 모드 pill | 전송 버튼 */}
            <div className="flex items-center gap-2">
              {/* + 버튼 */}
              <button
                ref={plusBtnRef}
                onClick={() => setShowIngredientPicker((v) => !v)}
                className={`relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                  showIngredientPicker ? 'bg-[#13AF70]' : 'bg-white shadow-sm'
                }`}
                aria-label="재료 선택"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform duration-200 ${showIngredientPicker ? 'rotate-45' : ''}`}
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke={showIngredientPicker ? 'white' : '#6B7280'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                {selectedIngredients.length > 0 && !showIngredientPicker && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#13AF70] rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">
                    {selectedIngredients.length}
                  </span>
                )}
              </button>

              {/* 스페이서 */}
              <div className="flex-1" />

              {/* 전송 버튼 */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className="w-7 h-7 rounded-full bg-[#13AF70] flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-transform"
                aria-label="전송"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
        </div>
      </div>
    </MobileContainer>
  )
}
