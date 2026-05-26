import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// NextAuth 설정을 한 곳에서 관리 - getServerSession에도 동일하게 전달해야 함
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        Object.assign(session.user, { id: token.sub })
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
}
