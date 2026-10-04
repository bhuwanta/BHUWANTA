'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from "@/components/dashboard/Sidebar"
import { createClient } from "@/lib/supabase/client"
import { Building2, Menu, X } from "lucide-react"
import Link from "next/link"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('Admin')

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserRole(user.user_metadata?.role || 'Admin')
      }
    }
    fetchRole()
  }, [])

  return (
    <div className="flex h-screen w-full bg-[#f7f8fa] overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#e8ecf2] h-16 px-4 shrink-0 absolute top-0 w-full z-20">
        <Link href="/crm" className="flex items-center gap-2 font-bold text-lg tracking-tight text-[#0f1d33]" onClick={() => setIsMobileMenuOpen(false)}>
          <Building2 className="h-6 w-6 text-[#c4a55a]" />
          <span>Bhuwanta<span className="text-[#c4a55a]">CRM</span></span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-[#5a6a82] hover:text-[#0f1d33] transition-colors">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0f1d33]/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar - hidden on mobile by default, absolute and shown when menu is open */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        flex flex-col h-full bg-white md:bg-transparent
      `}>
        <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} userRole={userRole} />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pt-20 md:pt-8 w-full flex flex-col min-h-0">
        <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </main>
    </div>
  )
}
