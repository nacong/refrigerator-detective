'use client'

export default function AddIngredientSheet({
  onClose,
  onCamera,
  onGallery,
  onManual,
}: {
  onClose: () => void
  onCamera: () => void
  onGallery: () => void
  onManual: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 px-5 pt-5 max-w-[430px] mx-auto"
        style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <p className="text-[16px] font-bold text-gray-900 mb-4">식재료 추가</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onCamera}
            className="flex items-center gap-3.5 px-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 active:bg-gray-100 transition-colors"
          >
            <span className="text-2xl">📷</span>
            <div className="text-left">
              <p className="text-[14px] font-bold text-gray-800">사진 찍기</p>
              <p className="text-[11px] text-gray-400 mt-0.5">카메라로 식재료를 스캔해요</p>
            </div>
          </button>

          <button
            onClick={onGallery}
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
