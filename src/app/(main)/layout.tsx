import FloatingChatbotButton from '@/components/FloatingChatbotButton'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingChatbotButton />
    </>
  )
}
