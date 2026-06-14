'use client'

import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react'

// ── 투어 단계 정의 ──────────────────────────────────────────────────
type Scene = 'home' | 'camera' | 'ingredients' | 'chat'
type Pose = 'frontview' | 'camera' | 'finding' | 'happy' | 'idea' | 'report' | 'salute' | 'check'

interface Step {
  scene: Scene
  pose: Pose
  target: string | null
  radius?: number
  title: string | null
  body: string | null
  primary: string
}

const STEPS: Step[] = [
  { scene: 'home',        pose: 'frontview', target: null,
    title: '안녕하세요. 저는 냉장고 탐정이에요.',
    body:  '식재료를 관리하고,\n남은 재료로 레시피를 찾아드릴게요.', primary: '다음' },

  { scene: 'home',        pose: 'camera',    target: 'button[aria-label="카메라"]', radius: 9999,
    title: '먼저 식재료를 등록해볼까요?',
    body:  '가운데 카메라 버튼으로\n냉장고나 영수증을 촬영할 수 있어요.', primary: '다음' },

  { scene: 'camera',      pose: 'camera',    target: '[data-tour="photo"]', radius: 22,
    title: '사진 속 식재료를 제가 찾아볼게요.',
    body:  '인식된 내용을 확인한 뒤\n한 번에 등록할 수 있어요.', primary: '촬영하기' },

  { scene: 'camera',      pose: 'finding',   target: '[data-tour="photo"]', radius: 22,
    title: null, body: null, primary: '다음' },

  { scene: 'ingredients', pose: 'happy',     target: '[data-tour="grid"]', radius: 16,
    title: '등록한 식재료는 여기에 있어요.',
    body:  '남은 수량과 소비일도\n한눈에 확인할 수 있어요.', primary: '다음' },

  { scene: 'home',        pose: 'idea',      target: '[data-tour="home-banner"]', radius: 22,
    title: '지금 필요한 조언을 알려드려요.',
    body:  '먼저 사용하면 좋은 재료를\n놓치지 않게 도와드릴게요.', primary: '다음' },

  { scene: 'home',        pose: 'report',    target: '[data-tour="tab-attention"]', radius: 12,
    title: '홈에서는 두 가지를 확인할 수 있어요.',
    body:  `‘오늘 확인해야 해요’는\n먼저 사용할 재료를,\n‘지금 재료로 만들 수 있어요’는\n만들 수 있는 요리를 보여드려요.`, primary: '다음' },

  { scene: 'home',        pose: 'salute',    target: 'button[aria-label="냉탐이와 레시피 찾기"]', radius: 9999,
    title: '저와 바로 대화할 수 있어요.',
    body:  '이 버튼을 누르고\n재료나 먹고 싶은 요리를 말해보세요.', primary: '다음' },

  { scene: 'chat',        pose: 'idea',      target: '[data-tour="chat-composer"]', radius: 16,
    title: '원하는 조건을 말해보세요.',
    body:  '재료나 조리 시간, 메뉴를 말하면\n알맞은 레시피를 찾아드려요.', primary: '다음' },

  { scene: 'home',        pose: 'salute',    target: null,
    title: '이제 준비가 끝났어요.',
    body:  '직접 식재료를 등록하고,\n저와 함께 레시피를 찾아보세요.', primary: '시작하기' },
]

// ── 데모 데이터 ─────────────────────────────────────────────────────
const DEMO_ITEMS = [
  { emoji: '🥛', name: '우유',   qty: '1팩', days: 1 },
  { emoji: '🧅', name: '양파',   qty: '2개', days: 2 },
  { emoji: '🌿', name: '대파',   qty: '1단', days: 3 },
  { emoji: '🥚', name: '달걀',   qty: '4개', days: 5 },
]
const DEMO_DETECT_BOXES = [
  { name: '우유', conf: 99, x: 11.5, y: 9,  w: 19, h: 61 },
  { name: '양파', conf: 97, x: 34,   y: 40, w: 22, h: 27 },
  { name: '대파', conf: 96, x: 52,   y: 32, w: 20, h: 43 },
  { name: '달걀', conf: 98, x: 70.5, y: 44, w: 25, h: 27 },
]
const DEMO_RECIPES = [
  { emoji: '🥣', name: '우유 양파 크림수프', min: 20, match: 2 },
  { emoji: '🍳', name: '대파 계란말이',       min: 15, match: 2 },
  { emoji: '🍚', name: '달걀볶음밥',           min: 12, match: 1 },
  { emoji: '🍲', name: '양파 달걀국',         min: 10, match: 1 },
]
const DEMO_CHAT = [
  { role: 'assistant', text: '안녕하세요!\n오늘 어떤 요리를 만들어볼까요?\n재료나 먹고 싶은 요리를 말씀해주세요!' },
  { role: 'user',      text: '달걀과 대파로 만들 수 있는 요리 알려줘' },
  { role: 'assistant', text: '🕵️ 달걀 · 대파 활용 레시피\n대파 계란말이와 달걀볶음밥을 추천드려요!' },
  { role: 'user',      text: '매운 음식도 추천해줘' },
  { role: 'assistant', text: '🕵️ 매운맛 사건 접수!\n김치볶음밥과 제육볶음은 어떠세요?' },
]

// ── 아이콘 ──────────────────────────────────────────────────────────
function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-2.5h6L17 8h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  )
}
function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" />
    </svg>
  )
}
function IconFridge() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <line x1="5" y1="10" x2="19" y2="10" />
      <line x1="8" y1="6.5" x2="8" y2="8" />
      <line x1="8" y1="13" x2="8" y2="16" />
    </svg>
  )
}
function IconRecipe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h11a2 2 0 012 2v14H8a2 2 0 01-2-2V4z" />
      <path d="M6 4a2 2 0 00-2 2v12a2 2 0 002 2" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  )
}
function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCheck({ color = '#fff', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Spinner() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%',
      border: '2.5px solid rgba(255,255,255,.4)',
      borderTopColor: '#fff',
      display: 'inline-block',
      animation: 'rdSpin .7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── 씬 공용 하단 내비 ────────────────────────────────────────────────
function SceneBottomNav({ active }: { active: 'home' | 'fridge' | 'camera' | 'recipe' | 'mypage' }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: '0 12px max(8px, env(safe-area-inset-bottom))',
      background: 'transparent', zIndex: 10,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6',
        boxShadow: '0 -2px 24px rgba(17,24,39,.08)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center', padding: '8px',
        minHeight: 56,
      }}>
        {(['home', 'fridge', 'camera', 'recipe', 'mypage'] as const).map((key) => {
          const labels = { home: '홈', fridge: '냉장고', camera: '카메라', recipe: '레시피', mypage: '마이페이지' }
          const isCamera = key === 'camera'
          const isActive = key === active
          if (isCamera) {
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <button
                  type="button"
                  aria-label="카메라"
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#13AF70', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: '4px solid #fff',
                    boxShadow: '0 6px 16px rgba(19,175,112,.35)',
                    marginTop: -20, cursor: 'default',
                  }}
                >
                  <IconCamera />
                </button>
              </div>
            )
          }
          return (
            <button
              key={key}
              type="button"
              aria-label={labels[key]}
              style={{
                width: 40, height: 40, margin: '0 auto', borderRadius: 12,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? '#13AF70' : '#9CA3AF', cursor: 'default',
                background: 'none', border: 'none',
              }}
            >
              {key === 'home' && <IconHome />}
              {key === 'fridge' && <IconFridge />}
              {key === 'recipe' && <IconRecipe />}
              {key === 'mypage' && <IconUser />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── TourHomeScene ────────────────────────────────────────────────────
function TourHomeScene({ tab, bannerOpen }: { tab: 'attention' | 'recipes'; bannerOpen: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더 */}
      <header style={{ padding: 'max(32px, env(safe-area-inset-top)) 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111827' }}>🌱 냉장고 탐정</h1>
        <div style={{ width: 28, height: 28, borderRadius: 9999, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" fill="#9CA3AF" /><path d="M10 9l6 3-6 3V9z" fill="white" /></svg>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 96 }}>
        {/* 추천 배너 */}
        <div data-tour="home-banner" style={{ margin: '0 16px 12px' }}>
          <div style={{
            borderRadius: 24, padding: '16px',
            background: 'linear-gradient(160deg, #F5F6F5, #F1F4F2)',
            border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden',
            opacity: bannerOpen ? 1 : 0.4,
            transition: 'opacity .3s ease',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/detective_idea.png" alt="냉탐이" style={{ width: 72, height: 72, objectFit: 'contain', animation: 'rdBob 3.4s ease-in-out infinite' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
                오늘은 대파 계란말이가 딱인데!
              </p>
              <button style={{ width: '100%', height: 44, borderRadius: 16, background: '#13AF70', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'default' }}>
                냉탐이와 레시피 찾기
              </button>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', position: 'relative', borderBottom: '1px solid #f3f4f6', background: '#fff' }}>
          {['오늘 확인해야 해요', '지금 재료로 만들 수 있어요'].map((label, i) => {
            const isActive = (i === 0 && tab === 'attention') || (i === 1 && tab === 'recipes')
            const dataTour = i === 0 ? 'tab-attention' : 'tab-recipes'
            return (
              <div
                key={i}
                data-tour={dataTour}
                style={{
                  flex: 1, padding: '12px 8px', textAlign: 'center',
                  fontSize: 13, fontWeight: 600,
                  color: isActive ? '#111827' : '#9CA3AF',
                  borderBottom: isActive ? '2px solid #111827' : '2px solid transparent',
                  transition: 'all .2s ease',
                  cursor: 'default',
                }}
              >
                {label}
                {i === 0 && <span style={{ marginLeft: 4, background: '#ef4444', color: '#fff', borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>4</span>}
              </div>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div style={{ padding: '16px 16px 0' }}>
          {tab === 'attention' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEMO_ITEMS.map((item) => (
                <div key={item.name} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 1px 4px rgba(17,24,39,.06)',
                }}>
                  <span style={{ fontSize: 22 }}>{item.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0 }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: item.days <= 2 ? '#ef4444' : '#9CA3AF', margin: 0 }}>D-{item.days}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DEMO_RECIPES.map((r) => (
                <div key={r.name} style={{
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 1px 4px rgba(17,24,39,.06)',
                }}>
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{r.min}분 · 재료 {r.match}개 일치</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 플로팅 챗봇 버튼 */}
      <button
        type="button"
        aria-label="냉탐이와 레시피 찾기"
        style={{
          position: 'absolute', bottom: 80, right: 16,
          width: 56, height: 56, borderRadius: '50%',
          background: '#13AF70', border: 'none', cursor: 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(19,175,112,.4)',
          zIndex: 10,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/detective_frontview.png" alt="" aria-hidden style={{ width: 36, height: 36, objectFit: 'contain' }} />
      </button>

      <SceneBottomNav active="home" />
    </div>
  )
}

// ── TourCameraScene ──────────────────────────────────────────────────
function TourCameraScene({ phase }: { phase: 'photo' | 'scanning' | 'done' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더 */}
      <header style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label="뒤로가기" style={{ width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
            <IconBack />
          </button>
          <h1 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>AI 식재료 인식</h1>
        </div>
        {/* step bar */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[1, 2].map((n) => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 9999,
              background: phase !== 'done' && n === 1 ? '#13AF70' : (phase === 'done' && n === 2 ? '#13AF70' : '#e5e7eb'),
              transition: 'background .3s ease',
            }} />
          ))}
        </div>
      </header>

      {phase !== 'done' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px 16px', gap: 14 }}>
          <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', margin: 0 }}>
            {phase === 'scanning'
              ? <><span style={{ color: '#13AF70', fontWeight: 600 }}>냉탐이</span>가 사진 속 식재료를 분석하고 있어요.</>
              : <>제가 준비한 <span style={{ color: '#13AF70', fontWeight: 600 }}>샘플 냉장고</span> 사진으로 체험해볼게요!</>}
          </p>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <div
              data-tour="photo"
              style={{
                position: 'relative', width: '100%', aspectRatio: '1402 / 1122', maxHeight: '100%',
                borderRadius: 20, overflow: 'hidden', border: '2px solid #e5e7eb', background: '#0B0E12',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/sample_fridge.png" alt="샘플 냉장고" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: phase === 'scanning' ? 0.92 : 1 }} />

              {phase !== 'scanning' && (
                <span style={{
                  position: 'absolute', top: 10, left: 10, padding: '4px 10px',
                  borderRadius: 9999, background: 'rgba(11,14,18,.62)', color: '#fff',
                  fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)',
                }}>📷 샘플 냉장고 사진</span>
              )}

              {phase === 'scanning' && (
                <>
                  {DEMO_DETECT_BOXES.map((b, i) => (
                    <span key={b.name} aria-hidden style={{
                      position: 'absolute', left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%',
                      border: '2px solid #34E29B', borderRadius: 8,
                      animation: `rdBoxIn 320ms cubic-bezier(.2,.8,.2,1) ${500 + i * 300}ms both`,
                    }}>
                      <span style={{
                        position: 'absolute', top: -2, left: -2, transform: 'translateY(-100%)',
                        padding: '2px 6px', borderRadius: 5, background: '#13AF70', color: '#fff',
                        fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                      }}>{b.name} {b.conf}%</span>
                    </span>
                  ))}
                  <span aria-hidden style={{
                    position: 'absolute', left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, transparent, #34E29B, transparent)',
                    boxShadow: '0 0 16px 4px rgba(52,226,155,.6)',
                    animation: 'rdScanLine 1.5s ease-in-out infinite',
                  }} />
                  <div style={{
                    position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)',
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    borderRadius: 9999, background: 'rgba(11,14,18,.74)', color: '#fff',
                    fontSize: 12, fontWeight: 600, backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
                  }}>
                    <Spinner /> 식재료를 찾고 있어요...
                  </div>
                </>
              )}
            </div>
          </div>

          <button disabled style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none',
            background: phase === 'scanning' ? '#9DD9C0' : '#13AF70', color: '#fff',
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {phase === 'scanning' ? <><Spinner /> 인식 중…</> : <>📷 촬영하기</>}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px 16px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/detective_check.png" alt="" aria-hidden style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, background: '#E8F9F1', borderRadius: 14, padding: '10px 13px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0E8F5B', margin: 0 }}>🕵️ 사건 해결!</p>
              <p style={{ fontSize: 12, color: '#374151', margin: '3px 0 0' }}>4가지 식재료를 찾았어요.</p>
            </div>
          </div>

          <div data-tour="detected" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_ITEMS.map((item, i) => (
              <div key={item.name} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                animation: `rdDetect 360ms cubic-bezier(.4,0,.2,1) ${i * 80}ms both`,
                boxShadow: '0 1px 4px rgba(17,24,39,.06)',
              }}>
                <span style={{ fontSize: 26 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{item.qty} · D-{item.days}</p>
                </div>
                <span style={{
                  width: 24, height: 24, borderRadius: 9999, background: '#13AF70',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><IconCheck /></span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <button disabled style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none',
            background: '#13AF70', color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(19,175,112,.28)',
          }}>
            <IconCheck /> 냉장고에 추가하기
          </button>
        </div>
      )}
    </div>
  )
}

// ── TourIngredientsScene ─────────────────────────────────────────────
function TourIngredientsScene() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
        borderBottom: '1px solid #f3f4f6', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label="뒤로가기" style={{ width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
            <IconBack />
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>나의 식재료</h1>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 16px 100px' }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>보관중인 식재료</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>4종</p>
        </div>

        <div data-tour="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {DEMO_ITEMS.map((item) => (
            <div key={item.name} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
              padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              boxShadow: '0 1px 4px rgba(17,24,39,.06)', position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: 6, left: 6, fontSize: 9.5, fontWeight: 600,
                padding: '2px 6px', borderRadius: 9999,
                background: item.days <= 2 ? '#FEE2E2' : '#E8F9F1',
                color: item.days <= 2 ? '#DC2626' : '#13AF70',
              }}>D-{item.days}</span>
              <span style={{ fontSize: 24, marginTop: 8 }}>{item.emoji}</span>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#1F2937', margin: 0, textAlign: 'center' }}>{item.name}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>{item.qty}</p>
            </div>
          ))}
          {/* 추가 카드 */}
          <div style={{
            background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            aspectRatio: '1', fontSize: 22, color: '#d1d5db',
          }}>+</div>
        </div>
      </div>

      <SceneBottomNav active="fridge" />
    </div>
  )
}

// ── TourChatScene ────────────────────────────────────────────────────
function TourChatScene() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
        borderBottom: '1px solid #f3f4f6', flexShrink: 0,
      }}>
        <button type="button" aria-label="뒤로가기" style={{ width: 36, height: 36, borderRadius: 12, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
          <IconBack />
        </button>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0 }}>냉탐이의 탐정사무소</h1>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {DEMO_CHAT.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, animation: `rdDetect 280ms cubic-bezier(.4,0,.2,1) ${i * 70}ms both` }}>
            {m.role === 'assistant' ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/detective_frontview.png" alt="" aria-hidden style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                <div style={{
                  background: '#f3f4f6', borderRadius: '18px 18px 18px 4px',
                  padding: '10px 14px', maxWidth: '75%',
                  fontSize: 13.5, color: '#1F2937', lineHeight: 1.55, whiteSpace: 'pre-line',
                }}>
                  {m.text}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: '#13AF70', borderRadius: '18px 18px 4px 18px',
                  padding: '10px 14px', maxWidth: '75%',
                  fontSize: 13.5, color: '#fff', lineHeight: 1.55,
                }}>
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div data-tour="chat-composer" style={{ borderTop: '1px solid #f3f4f6', padding: '10px 16px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', borderRadius: 16, padding: '8px 8px 8px 16px' }}>
          <span style={{ flex: 1, fontSize: 14, color: '#9CA3AF' }}>메시지를 입력하세요…</span>
          <span style={{
            width: 32, height: 32, borderRadius: 9999, background: '#13AF70',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><IconSend /></span>
        </div>
      </div>
    </div>
  )
}

// ── Spotlight ────────────────────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }

function Spotlight({ rect, radius, containerW, containerH }: {
  rect: Rect | null
  radius: number
  containerW: number
  containerH: number
}) {
  const pad = 8
  const hx = rect ? rect.x - pad : 0
  const hy = rect ? rect.y - pad : 0
  const hw = rect ? rect.w + pad * 2 : 0
  const hh = rect ? rect.h + pad * 2 : 0
  const rx = !rect ? 0 : (radius === 9999 ? Math.min(hw, hh) / 2 : radius + 6)
  const geo: React.CSSProperties = {
    transition: 'x .42s cubic-bezier(.4,0,.2,1), y .42s cubic-bezier(.4,0,.2,1), width .42s cubic-bezier(.4,0,.2,1), height .42s cubic-bezier(.4,0,.2,1)',
  }
  return (
    <svg
      width={containerW} height={containerH}
      viewBox={`0 0 ${containerW} ${containerH}`}
      style={{ position: 'absolute', inset: 0, zIndex: 61, pointerEvents: 'none' }}
    >
      <defs>
        <mask id="rd-spot-mask">
          <rect x="0" y="0" width={containerW} height={containerH} fill="#fff" />
          {rect && <rect style={geo} x={hx} y={hy} width={hw} height={hh} rx={rx} ry={rx} fill="#000" />}
        </mask>
      </defs>
      <rect x="0" y="0" width={containerW} height={containerH} fill="rgba(11,14,18,.74)" mask="url(#rd-spot-mask)" />
      {rect && (
        <rect
          className="spot-ring"
          style={geo}
          x={hx} y={hy} width={hw} height={hh} rx={rx} ry={rx}
          fill="none" stroke="#34E29B" strokeWidth="2.5"
        />
      )}
    </svg>
  )
}

// ── CoachCard ────────────────────────────────────────────────────────
function CoachCard({
  coachStyle, anim, pose, title, body, step, total,
}: {
  coachStyle: React.CSSProperties
  anim: string
  pose: Pose
  title: string | null
  body: string | null
  step: number
  total: number
}) {
  const poseSrc: Record<Pose, string> = {
    frontview: '/images/detective_frontview.png',
    camera:    '/images/detective_camera.png',
    finding:   '/images/detective_finding.png',
    happy:     '/images/detective_happy.png',
    idea:      '/images/detective_idea.png',
    report:    '/images/detective_report.png',
    salute:    '/images/detective_salute.png',
    check:     '/images/detective_check.png',
  }

  return (
    <div style={{
      position: 'absolute', left: 14, right: 14, zIndex: 70,
      ...coachStyle,
      animation: `${anim} 420ms cubic-bezier(.2,.8,.2,1) both`,
    }}>
      {/* 캐릭터 + 말풍선 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ position: 'relative', width: 96, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poseSrc[pose]} alt="냉탐이"
            draggable={false}
            style={{ width: 96, height: 96, objectFit: 'contain', display: 'block', animation: 'rdBob 3.4s ease-in-out infinite' }}
          />
          <span aria-hidden style={{
            position: 'absolute', left: '50%', bottom: 2, transform: 'translateX(-50%)',
            width: '64%', height: 10,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,.22), rgba(0,0,0,0) 70%)',
          }} />
        </div>

        <div style={{
          position: 'relative', flex: 1, background: '#fff', borderRadius: 20,
          padding: '14px 16px 15px', boxShadow: '0 10px 30px rgba(11,14,18,.28)', border: '1px solid #EDE7F7',
        }}>
          {/* 꼬리 */}
          <span aria-hidden style={{
            position: 'absolute', left: -6, bottom: 20, width: 12, height: 12,
            background: '#fff', borderLeft: '1px solid #EDE7F7', borderBottom: '1px solid #EDE7F7',
            transform: 'rotate(45deg)',
          }} />
          {/* 진행 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 9999, background: '#EEF0F2', overflow: 'hidden' }}>
              <div style={{
                width: `${((step + 1) / total) * 100}%`, height: '100%',
                borderRadius: 9999, background: '#13AF70', transition: 'width .4s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', flexShrink: 0 }}>
              {step + 1}<span style={{ color: '#D1D5DB' }}> / {total}</span>
            </span>
          </div>
          {title && (
            <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.4, margin: '0 0 5px', wordBreak: 'keep-all' }}>{title}</p>
          )}
          {body && (
            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#4B5563', lineHeight: 1.62, margin: 0, whiteSpace: 'pre-line', wordBreak: 'keep-all' }}>{body}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── OnboardingTour (메인 컨트롤러) ────────────────────────────────────
export default function OnboardingTour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const [camPhase, setCamPhase] = useState<'photo' | 'scanning' | 'done'>('photo')
  const [tabPhase, setTabPhase] = useState<'attention' | 'recipes'>('attention')
  const [rect, setRect] = useState<Rect | null>(null)
  const [containerSize, setContainerSize] = useState({ w: 390, h: 844 })
  const frameRef = useRef<HTMLDivElement>(null)

  const cfg = STEPS[step]
  const isLast = step === STEPS.length - 1
  const camDone = camPhase === 'done'

  // 단계별 자동 동작
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    if (step === 2) setCamPhase('photo')
    if (step === 3) {
      setCamPhase('scanning')
      timers.push(setTimeout(() => setCamPhase('done'), 2400))
    }
    if (step === 6) {
      setTabPhase('attention')
      timers.push(setTimeout(() => setTabPhase('recipes'), 2200))
    }
    return () => timers.forEach(clearTimeout)
  }, [step])

  const resolveTarget = useCallback((): string | null => {
    if (step === 3) return camDone ? '[data-tour="detected"]' : '[data-tour="photo"]'
    if (step === 6) return tabPhase === 'attention' ? '[data-tour="tab-attention"]' : '[data-tour="tab-recipes"]'
    return cfg.target
  }, [step, camDone, tabPhase, cfg.target])

  const measure = useCallback(() => {
    const target = resolveTarget()
    const root = frameRef.current
    if (!target || !root) { setRect(null); return }
    const rootB = root.getBoundingClientRect()
    setContainerSize({ w: rootB.width, h: rootB.height })
    const el = root.querySelector<HTMLElement>(target)
    if (!el) { setRect(null); return }
    const b = el.getBoundingClientRect()
    setRect({
      x: b.left - rootB.left,
      y: b.top - rootB.top,
      w: b.width,
      h: b.height,
    })
  }, [resolveTarget])

  useLayoutEffect(() => {
    const root = frameRef.current
    if (root) {
      const b = root.getBoundingClientRect()
      setContainerSize({ w: b.width, h: b.height })
    }
    measure()
    const ids = [requestAnimationFrame(measure)]
    const ts = [80, 260, 480, 700].map((d) => setTimeout(measure, d))
    window.addEventListener('resize', measure)
    return () => {
      ids.forEach(cancelAnimationFrame)
      ts.forEach(clearTimeout)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const goNext = () => { if (isLast) onFinish(); else setStep((s) => s + 1) }
  const goPrev = () => setStep((s) => Math.max(0, s - 1))
  const canPrev = step > 0
  const nextDisabled = step === 3 && !camDone

  const isScan = step === 3
  const title = isScan ? (camDone ? '재료를 모두 찾았어요.' : '식재료를 찾고 있어요.') : cfg.title
  const body  = isScan ? (camDone ? '우유, 양파, 대파, 달걀\n네 가지를 등록했어요.' : '잠시만 기다려 주세요.') : cfg.body
  const primaryLabel = isScan && !camDone ? '인식 중…' : cfg.primary

  // 코치 카드 위치 계산
  // 하단 고정 버튼 바 클리어런스: 씬 내비(72) + 버튼 높이(54) + 여백(12) = 138
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const GAP = 14
  const CARD_H = 180
  const NAV_CLEARANCE = 230    // 씬 내비(100) + 버튼(54) + 여백(76)
  const H = containerSize.h
  let coachStyle: React.CSSProperties
  let coachAnim: string
  if (!rect) {
    coachStyle = { bottom: NAV_CLEARANCE + 20, left: 14, right: 14 }
    coachAnim = 'rdCoachFade'
  } else {
    const roomAbove = rect.y
    const roomBelow = H - (rect.y + rect.h) - NAV_CLEARANCE
    if (roomBelow >= roomAbove) {
      coachStyle = { top: clamp(rect.y + rect.h + GAP, 16, H - CARD_H - NAV_CLEARANCE - 16) }
      coachAnim = 'rdCoachDown'
    } else {
      coachStyle = { bottom: clamp(H - rect.y + GAP, NAV_CLEARANCE + 8, H - CARD_H - 16) }
      coachAnim = 'rdCoachUp'
    }
  }

  const homeTab = step === 6 ? tabPhase : 'attention'
  const bannerOpen = step === 5 || step === 6 || step === 7

  const scene = (() => {
    if (cfg.scene === 'camera')
      return <TourCameraScene phase={camPhase} />
    if (cfg.scene === 'ingredients')
      return <TourIngredientsScene />
    if (cfg.scene === 'chat')
      return <TourChatScene />
    return <TourHomeScene tab={homeTab} bannerOpen={bannerOpen} />
  })()

  const radius = cfg.radius != null ? cfg.radius : 18

  return (
    <div ref={frameRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#f3f4f6' }}>
      {/* 씬 */}
      <div style={{ position: 'absolute', inset: 0 }}>{scene}</div>

      {/* 탭 차단 (투어 중 씬 클릭 방지) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 60 }} onClick={(e) => e.stopPropagation()} />

      {/* 스포트라이트 */}
      <Spotlight rect={rect} radius={radius} containerW={containerSize.w} containerH={containerSize.h} />

      {/* 건너뛰기 */}
      {!isLast && (
        <button
          type="button"
          onClick={onFinish}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 72,
            padding: '7px 14px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.28)',
            background: 'rgba(17,24,39,.42)', color: '#fff', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >건너뛰기</button>
      )}

      {/* 코치 카드 (캐릭터 + 말풍선) */}
      <CoachCard
        key={step}
        coachStyle={coachStyle}
        anim={coachAnim}
        pose={cfg.pose}
        title={title}
        body={body}
        step={step}
        total={STEPS.length}
      />

      {/* 하단 고정 이전/다음 버튼 — 씬 하단 내비(~100px) 위에 렌더링 */}
      <div style={{
        position: 'absolute', bottom: 'calc(160px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 72,
        padding: '0 16px',
        display: 'flex', gap: 10,
      }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          style={{
            flex: 1, height: 54, borderRadius: 16, border: 0,
            background: canPrev ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.07)',
            color: canPrev ? '#fff' : 'rgba(255,255,255,.3)',
            fontSize: 15, fontWeight: 700, cursor: canPrev ? 'pointer' : 'default',
            backdropFilter: 'blur(6px)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          <span aria-hidden style={{ fontSize: 16 }}>←</span> 이전
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          style={{
            flex: 1, height: 54, borderRadius: 16, border: 0,
            background: nextDisabled ? '#9DD9C0' : '#13AF70', color: '#fff',
            fontSize: 16, fontWeight: 800, cursor: nextDisabled ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: nextDisabled ? 'none' : '0 8px 20px rgba(19,175,112,.36)',
            transition: 'background .2s ease',
            fontFamily: 'inherit',
          }}
        >
          {nextDisabled && <Spinner />}
          {primaryLabel}
          {!nextDisabled && <span aria-hidden style={{ fontSize: 16 }}>→</span>}
        </button>
      </div>
    </div>
  )
}
