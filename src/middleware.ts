export { default } from 'next-auth/middleware'

// /login을 제외한 모든 라우트를 보호
export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)'],
}
