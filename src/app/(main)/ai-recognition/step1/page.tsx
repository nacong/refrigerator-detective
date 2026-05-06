'use client'

import { useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import ProgressBar from '@/components/ui/ProgressBar'
import { useAppStore } from '@/store/useAppStore'

function AIStep1Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { setCapturedImage, setRecognizedIngredients } = useAppStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      const [header, base64] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
      setCapturedImage(base64, mimeType)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    const { capturedImage, capturedImageMime } = useAppStore.getState()
    if (!capturedImage || !capturedImageMime) return

    setIsProcessing(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: capturedImage, mimeType: capturedImageMime }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || `오류가 발생했습니다 (${res.status})`)
        return
      }

      setRecognizedIngredients(data.ingredients || [])
      const next = from
        ? `/ai-recognition/step2?from=${from}`
        : '/ai-recognition/step2'
      router.push(next)
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <MobileContainer>
      <header className="safe-top pt-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 pb-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            aria-label="뒤로가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-gray-800">AI 식재료 인식</h1>
        </div>
        {/* 2단계 프로그레스 바 */}
        <ProgressBar currentStep={1} totalSteps={2} />
      </header>

      <div className="flex-1 flex flex-col px-4 py-6 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            냉장고 속 재료를 사진으로 찍어주세요.<br />
            <span className="text-[#13AF70] font-medium">냉탐이</span>가 식재료를 인식해 드려요!
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 min-h-[300px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 active:bg-gray-100 transition-colors overflow-hidden"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="촬영된 이미지" className="w-full h-full object-cover rounded-3xl" />
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#E8F9F1] flex items-center justify-center">
                <span className="text-3xl">📷</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">사진을 촬영하거나 선택하세요</p>
                <p className="text-xs text-gray-400 mt-1">카메라 또는 갤러리에서 불러오기</p>
              </div>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview && (
          <button
            onClick={() => {
              setPreview(null)
              setCapturedImage(null, null)
              setErrorMessage(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="text-sm text-gray-400 underline text-center"
          >
            다른 사진 선택하기
          </button>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 safe-bottom">
        <button
          onClick={preview ? handleAnalyze : () => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`w-full font-semibold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
            preview ? 'bg-[#13AF70] text-white' : 'bg-gray-100 text-gray-600'
          } disabled:opacity-50`}
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>인식 중...</span>
            </>
          ) : (
            <>
              <span>📷</span>
              <span>{preview ? 'AI로 식재료 인식하기' : '사진 찍기'}</span>
            </>
          )}
        </button>
      </div>
    </MobileContainer>
  )
}

export default function AIStep1Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AIStep1Content />
    </Suspense>
  )
}
