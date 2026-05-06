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

      if (!res.ok || !res.body) throw new Error('응답 오류')

      // 레시피 카드 헤더 파싱
      let chatRecipes: ChatMessage['chatRecipes'] = []
      try {
        const header = res.headers.get('X-Recipe-Cards')
        if (header) chatRecipes = JSON.parse(decodeURIComponent(header))
      } catch { /* ignore */ }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        chatRecipes,
        createdAt: new Date().toISOString(),
      }
      addChatMessage(assistantMessage)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        assistantContent += chunk

        useAppStore.setState((state) => {
          const msgs = [...state.chatMessages]
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: assistantContent }
          return { chatMessages: msgs }
        })
      }

      // 스트리밍 완료 후 — AI 응답의 "레시피명:" 기준으로 카드 매칭
      const cards = chatRecipes ?? []

      // 1) 응답에서 "레시피명: X" 추출
      const nameMatches = [...assistantContent.matchAll(/레시피명:\s*([^\n]+)/g)]
      const mentionedNames = nameMatches.map((m) => m[1].trim())

      const matched = mentionedNames.length > 0
        ? cards.filter((r) =>
            mentionedNames.some(
              (n) => r.name === n || n.includes(r.name) || r.name.includes(n)
            )
          )
        : cards.filter((r) => assistantContent.includes(r.name))

      // 매칭 실패 시 전체 카드 표시 안 함 (엉뚱한 카드 방지)
      useAppStore.setState((state) => {
        const msgs = [...state.chatMessages]
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          chatRecipes: matched,
        }
        return { chatMessages: msgs }
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('채팅 오류:', msg)
      addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `오류: ${msg}`,
        createdAt: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return { chatMessages, sendMessage, isLoading }
}
