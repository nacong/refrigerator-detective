'use client'

import { useRouter } from 'next/navigation'
import MobileContainer from '@/components/layout/MobileContainer'
import OnboardingTour from '@/components/onboarding/OnboardingTour'

export default function TutorialPage() {
  const router = useRouter()
  return (
    <MobileContainer fullHeight>
      <OnboardingTour onFinish={() => router.replace('/')} />
    </MobileContainer>
  )
}
