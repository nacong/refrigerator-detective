import { useQuery } from '@tanstack/react-query'
import type { SoloCookingVideo } from '@/app/api/supabase/solo-cooking-videos/route'

async function fetchSoloCookingVideos(): Promise<SoloCookingVideo[]> {
  const res = await fetch('/api/supabase/solo-cooking-videos')
  if (!res.ok) throw new Error('fetch failed')
  const data = await res.json()
  console.log('[solo-cooking-videos]', data)
  return data
}

export function useSoloCookingVideos() {
  return useQuery({
    queryKey: ['solo-cooking-videos'],
    queryFn: fetchSoloCookingVideos,
    staleTime: 0,
  })
}
