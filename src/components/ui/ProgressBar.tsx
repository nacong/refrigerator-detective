// AI 인식 단계 진행 바 컴포넌트 (2단계 또는 3단계 모두 지원)
interface ProgressBarProps {
  currentStep: number
  totalSteps?: 2 | 3
}

export default function ProgressBar({ currentStep, totalSteps = 3 }: ProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => `STEP ${i + 1}`)

  return (
    <div className="flex items-center gap-1 px-4 pb-3">
      {steps.map((label, index) => {
        const stepNum = index + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                isCompleted || isActive ? 'bg-[#13AF70]' : 'bg-gray-200'
              }`}
            />
            <span
              className={`text-[10px] font-medium ${
                isActive ? 'text-[#13AF70]' : isCompleted ? 'text-gray-400' : 'text-gray-300'
              }`}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
