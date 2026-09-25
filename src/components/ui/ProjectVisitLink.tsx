'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Keep visitors on a project's inline form when it is available. */
export function ProjectVisitLink({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const href = ['/shabad-open-plots', '/projects/arudra'].includes(pathname)
    ? '#book-visit'
    : '/#book-visit'
  return <Link href={href}>{children}</Link>
}
