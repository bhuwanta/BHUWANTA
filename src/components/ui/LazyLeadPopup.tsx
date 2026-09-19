'use client'

import dynamic from 'next/dynamic'

// The popup opens two seconds after load, so its code (framer-motion and the
// form) is fetched after the page rather than as part of it.
export const LazyLeadPopup = dynamic(
  () => import('@/components/ui/LeadPopup').then((m) => m.LeadPopup),
  { ssr: false },
)
