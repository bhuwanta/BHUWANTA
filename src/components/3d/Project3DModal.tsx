'use client'

import React, { useEffect } from 'react'
import { Project3DData } from '@/data/projects3d/types'
import { ProjectLayout3DViewer } from './ProjectLayout3DViewer'
import { X, Box } from 'lucide-react'

interface Project3DModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project3DData
  initialPlotId?: string
}

export function Project3DModal({
  isOpen,
  onClose,
  project,
  initialPlotId,
}: Project3DModalProps) {
  // Close on Escape key and prevent background scroll
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.projectName} 3D Interactive Layout`}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-7xl h-[94vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-brand-gold/30 flex flex-col">
        <ProjectLayout3DViewer
          project={project}
          onClose={onClose}
          isModal={true}
          initialPlotId={initialPlotId}
        />
      </div>
    </div>
  )
}
