'use client'

import { useRef } from 'react'

export default function AddIngredientSheet({
  onClose,
  onFileSelected,
  onManual,
}: {
  onClose: () => void
  onFileSelected: (base64: string, mimeType: string) => void
  onManual: () => void
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const [header, base64] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
      onFileSelected(base64, mimeType)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-5 pt-5 max-w-[430px] mx-auto"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <p className="text-[16px] font-bold text-gray-900 mb-4">식재료 추가</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 active:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">📷</span>
            <div className="text-left">
              <p className="text-[14px] font-bold text-gray-800">사진 찍기</p>
              <p className="text-[11px] text-gray-400 mt-0.5">카메라로 식재료를 스캔해요</p>
            </div>
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 active:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">🖼️</span>
            <div className="text-left">
              <p className="text-[14px] font-bold text-gray-800">갤러리에서 선택</p>
              <p className="text-[11px] text-gray-400 mt-0.5">보관함 사진으로 인식해요</p>
            </div>
          </button>

          <button
            onClick={onManual}
            className="flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 active:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">✏️</span>
            <div className="text-left">
              <p className="text-[14px] font-bold text-gray-800">직접 입력</p>
              <p className="text-[11px] text-gray-400 mt-0.5">이름, 수량, 유통기한을 입력해요</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
