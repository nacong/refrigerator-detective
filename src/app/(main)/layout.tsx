// (main) 그룹 레이아웃 - 인증이 필요한 페이지들의 공통 래퍼
// 미들웨어에서 인증을 처리하므로 여기서는 단순 래퍼 역할
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
