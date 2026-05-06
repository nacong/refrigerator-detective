export default function MobileContainer({
  children,
  className = '',
  fullHeight = false,
}: {
  children: React.ReactNode
  className?: string
  fullHeight?: boolean
}) {
  const heightClass = fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'

  return (
    <div className={`${heightClass} bg-gray-100 flex justify-center`}>
      <div
        className={`w-full max-w-[430px] ${heightClass} bg-white relative flex flex-col ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
