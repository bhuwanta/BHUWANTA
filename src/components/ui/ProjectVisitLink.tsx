'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { projectVisitHref } from '@/lib/project-links'

/** Keep visitors on a project's inline form when it is available. */
export function ProjectVisitLink({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const href = projectVisitHref(pathname)
  return <Link href={href}>{children}</Link>
}
