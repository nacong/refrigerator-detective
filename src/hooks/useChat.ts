'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ChatMessage } from '@/types'

export function useChat() {
  const [isLoading, setIsLoading] = useState(false)
  const { chatMessages, addChatMessage } = useAppStore()

  const sendMessage = async (content: string, selectedIngredients: string[] = [], mode: 'search' | 'generate' = 'search') => {
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
          mode,
        }),
      })

      if (!res.ok || !res.body) {
        if (res.status === 429) throw new Error('__429__')
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`)
      }

      // 레시피 카드는 응답 헤더에서 읽음
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

  const sendFridgeRecipe = async (ingredients: string[]) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: '🧹 냉털 레시피 추천해줘!',
      selectedIngredients: ingredients.length > 0 ? [...ingredients] : undefined,
      createdAt: new Date().toISOString(),
    }
    addChatMessage(userMessage)
    setIsLoading(true)

    try {
      const res = await fetch('/api/gemini/fridge-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

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

  const sendOneMoreIngredient = async (ingredients: string[]) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: '재료 하나만 추가하면 만들 수 있는 맛있는 레시피 추천해줘.',
      selectedIngredients: ingredients.length > 0 ? [...ingredients] : undefined,
      createdAt: new Date().toISOString(),
    }
    addChatMessage(userMessage)
    setIsLoading(true)

    try {
      const res = await fetch('/api/gemini/one-more-ingredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      let chatRecipes: ChatMessage['chatRecipes'] = []
      try {
        const header = res.headers.get('X-Recipe-Cards')
        if (header) chatRecipes = JSON.parse(decodeURIComponent(header))
      } catch { /* ignore */ }

      let additionalIngredient: string | undefined
      try {
        const header = res.headers.get('X-Additional-Ingredient')
        if (header) additionalIngredient = decodeURIComponent(header) || undefined
      } catch { /* ignore */ }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      addChatMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        chatRecipes,
        additionalIngredient,
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

  return { chatMessages, sendMessage, sendFridgeRecipe, sendOneMoreIngredient, isLoading }
}
