'use client'

/**
 * DetectiveOfficeSection
 * 하단 반면을 차지하는 인터랙티브 캐릭터 영역.
 *  - 배경: /images/detective_kitchen.png
 *  - 중앙에 큼지막한 마스코트 + 위쪽에 말풍선
 *  - 영역 전체가 탭 가능 — onClick으로 레시피 추천 챗봇으로 진입
 */

interface DetectiveOfficeSectionProps {
  characterSrc?: string
  speechBubbleText?: string
  onClick?: () => void
  onDismiss?: () => void
}

export default function DetectiveOfficeSection({
  characterSrc = '/images/detective_recipe.png',
  speechBubbleText = '저를 눌러보세요.\n레시피를 찾아드릴게요!',
  onClick,
  onDismiss,
}: DetectiveOfficeSectionProps) {
  return (
    <div className="relative w-full h-full">
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="닫기"
        className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-gray-500 text-[13px] font-medium active:bg-white/90 transition-colors"
      >
        ✕
      </button>
    )}
    <button
      type="button"
      onClick={onClick}
      aria-label="냉장고 탐정에게 레시피 추천 요청하기"
      className="do-section group block w-full h-full text-left relative overflow-hidden"
    >
      {/* 배경 — 디텍티브 오피스 */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/detective_kitchen.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 상단 페이드 */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-10"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* 말풍선 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: '5%', width: 'max-content', maxWidth: '78%' }}
      >
        <div
          className="relative bg-white rounded-3xl px-5 py-3 text-center border border-[#EDE7F7]"
          style={{
            minWidth: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <p className="text-[14px] font-bold text-gray-800 leading-snug break-keep whitespace-pre-line m-0">
            {speechBubbleText}
          </p>
          {/* 꼬리 */}
          <span
            aria-hidden
            className="absolute bg-white"
            style={{
              left: '50%', bottom: -7,
              transform: 'translateX(-50%) rotate(45deg)',
              width: 14, height: 14,
              borderRight: '1px solid #EDE7F7',
              borderBottom: '1px solid #EDE7F7',
              borderBottomRightRadius: 3,
            }}
          />
          <span aria-hidden className="absolute text-[#B9A4F2] text-[12px]" style={{ top: -6, right: 14 }}>✦</span>
          <span aria-hidden className="absolute text-[#B9A4F2] text-[8px] opacity-80" style={{ top: 12, right: 0 }}>✦</span>
        </div>
      </div>

      {/* 마스코트 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[5]"
        style={{ bottom: '14%', width: '64%', maxWidth: 280, aspectRatio: '1 / 1' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={characterSrc}
          alt="냉탐이"
          className="w-full h-full object-contain animate-do-bob"
          draggable={false}
        />
        {/* 그림자 */}
        <span
          aria-hidden
          className="absolute"
          style={{
            left: '50%', bottom: '2%',
            transform: 'translateX(-50%)',
            width: '70%', height: 14,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 70%)',
            zIndex: -1,
          }}
        />
      </div>

    </button>
    </div>
  )
}
