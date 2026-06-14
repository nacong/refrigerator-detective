import { create } from 'zustand'
import type { Ingredient, ChatMessage, ChatRecipe } from '@/types'

interface AppState {
  capturedImage: string | null
  capturedImageMime: string | null
  recognizedIngredients: Partial<Ingredient>[]
  chatMessages: ChatMessage[]
  selectedRecipe: ChatRecipe | null
  floatingButtonHidden: boolean
  pendingChatIngredients: string[] | null
  pendingChatMessage: string | null

  setCapturedImage: (image: string | null, mime: string | null) => void
  setRecognizedIngredients: (ingredients: Partial<Ingredient>[]) => void
  updateRecognizedIngredient: (index: number, updates: Partial<Ingredient>) => void
  removeRecognizedIngredient: (index: number) => void
  addChatMessage: (message: ChatMessage) => void
  clearChatMessages: () => void
  setSelectedRecipe: (recipe: ChatRecipe | null) => void
  setFloatingButtonHidden: (hidden: boolean) => void
  setPendingChat: (ingredients: string[], message: string) => void
  clearPendingChat: () => void
}

export const useAppStore = create<AppState>((set) => ({
  capturedImage: null,
  capturedImageMime: null,
  recognizedIngredients: [],
  chatMessages: [],
  selectedRecipe: null,
  floatingButtonHidden: false,
  pendingChatIngredients: null,
  pendingChatMessage: null,

  setCapturedImage: (image, mime) =>
    set({ capturedImage: image, capturedImageMime: mime }),

  setRecognizedIngredients: (ingredients) =>
    set({ recognizedIngredients: ingredients }),

  updateRecognizedIngredient: (index, updates) =>
    set((state) => {
      const updated = [...state.recognizedIngredients]
      updated[index] = { ...updated[index], ...updates }
      return { recognizedIngredients: updated }
    }),

  removeRecognizedIngredient: (index) =>
    set((state) => ({
      recognizedIngredients: state.recognizedIngredients.filter((_, i) => i !== index),
    })),

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setSelectedRecipe: (recipe) => set({ selectedRecipe: recipe }),
  setFloatingButtonHidden: (hidden) => set({ floatingButtonHidden: hidden }),
  setPendingChat: (ingredients, message) =>
    set({ pendingChatIngredients: ingredients, pendingChatMessage: message }),
  clearPendingChat: () => set({ pendingChatIngredients: null, pendingChatMessage: null }),
}))
