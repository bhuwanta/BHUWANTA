import React from 'react'

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-slate-950 overflow-hidden text-white">
      {children}
    </div>
  )
}
