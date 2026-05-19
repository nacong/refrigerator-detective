'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ChatMessage } from '@/types'

export function useChat() {
  const [isLoading, setIsLoading] = useState(false)
  const { chatMessages, addChatMessage } = useAppStore()

  const sendMessage = async (content: string, selectedIngredients: string[] = []) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      selectedIngredients: selectedIngredients.length > 0 ? [...selectedIngredients] : undefined,
      createdAt: new Date().toISOString(),
    }
    addChatMessage(userMessage)
    setIsLoading(true)

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: chatMessages.map((m) => ({ role: m.role, content: m.content })),
          selectedIngredients,
        }),
      })

      if (!res.ok || !res.body) {
        if (res.status === 429) throw new Error('__429__')
        throw new Error('응답 오류')
      }

      // 서버에서 이미 인텐트를 판단해 레시피 카드를 결정함
      let chatRecipes: ChatMessage['chatRecipes'] = []
      try {
        const header = res.headers.get('X-Recipe-Cards')
        if (header) chatRecipes = JSON.parse(decodeURIComponent(header))
      } catch { /* ignore */ }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      addChatMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        chatRecipes,
        createdAt: new Date().toISOString(),
      })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value)

        useAppStore.setState((state) => {
          const msgs = [...state.chatMessages]
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: assistantContent }
          return { chatMessages: msgs }
        })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('채팅 오류:', msg)
      const displayMsg = msg === '__429__'
        ? '지금 탐정사무소가 너무 바빠서요! 😅 잠깐만 기다렸다가 다시 말씀해 주실 수 있을까요?'
        : `오류: ${msg}`
      addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: displayMsg,
        createdAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { chatMessages, sendMessage, isLoading }
}
