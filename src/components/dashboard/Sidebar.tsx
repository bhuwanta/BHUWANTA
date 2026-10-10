import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/crm/login/actions";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  FileText,
  Map,
  LineChart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  MessageCircle,
  SlidersHorizontal,
  Settings
} from "lucide-react";

import { getEffectivePermissionsClient } from "@/app/(CRM_SOFTWARE)/crm/modules/actions";
import { useEffect, useState } from "react";

const navigation = [
  { id: 'dashboard', name: 'Dashboard', href: '/crm', icon: LayoutDashboard },
  { id: 'leads', name: 'Leads', href: '/crm/leads', icon: Users },
  { id: 'whatsapp', name: 'WhatsApp Leads', href: '/crm/whatsapp', icon: MessageCircle },
  { id: 'projects', name: 'Projects', href: '/crm/projects', icon: Building2 },
  { id: 'reports', name: 'Reports', href: '/crm/reports', icon: LineChart },
  { id: 'modules', name: 'Modules', href: '/crm/modules', icon: SlidersHorizontal },
  { id: 'users', name: 'Users', href: '/crm/users', icon: Shield },
  { id: 'settings', name: 'Settings', href: '/crm/settings', icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onNavigate?: () => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ isCollapsed, toggleCollapse, onNavigate, userRole = 'Admin', userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const [permissions, setPermissions] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPerms() {
      try {
        const perms = await getEffectivePermissionsClient()
        setPermissions(perms)
      } finally {
        setIsLoading(false)
      }
    }
    loadPerms()
  }, [])

  const filteredNavigation = navigation.filter(item => {
    // If it's still loading, we return false here so they aren't part of the array
    // (We will display skeleton loaders in the UI instead)
    if (isLoading) return false;
    
    // Check specific permission
    const access = permissions[item.id]
    if (access === 'none' || !access) {
      // Allow dashboard if they have access to *anything*? 
      // Actually dashboard should be explicitly permitted or denied.
      if (item.id === 'dashboard') return true; // Always allow dashboard for now
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-[#e8ecf2] bg-white">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-[#e8ecf2]", isCollapsed ? "px-0 justify-center" : "px-6 justify-between")}>
        {!isCollapsed && (
          <Link href="/crm" onClick={() => onNavigate?.()} className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#0f1d33]">
            <Building2 className="h-6 w-6 text-[#c4a55a]" />
            <span>Bhuwanta<span className="text-[#c4a55a]">CRM</span></span>
          </Link>
        )}
        <button 
          onClick={toggleCollapse} 
          className={cn("hidden md:inline-flex text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] rounded-md p-1.5 transition-colors", isCollapsed && "mx-auto")}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className={cn("flex-1 space-y-1 py-4", isCollapsed ? "px-2" : "px-3")}>
        {isLoading ? (
          // Skeleton loaders
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("flex items-center gap-3 rounded-md px-3 py-2", isCollapsed ? "justify-center" : "")}>
              <div className="h-5 w-5 rounded bg-gray-200 animate-pulse shrink-0" />
              {!isCollapsed && <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />}
            </div>
          ))
        ) : (
          filteredNavigation.map((item) => {
            const isActive = item.href === '/crm' 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={cn(
                  isActive
                    ? "bg-[#1e3a5f]/10 text-[#1e3a5f]"
                    : "text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#0f1d33]",
                  "group flex items-center rounded-md text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center py-3 px-2" : "px-3 py-2.5"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon
                  className={cn(
                    isActive ? "text-[#1e3a5f]" : "text-[#5a6a82] group-hover:text-[#0f1d33]",
                    isCollapsed ? "h-6 w-6" : "mr-3 h-5 w-5",
                    "flex-shrink-0 transition-colors"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })
        )}
      </nav>
      <div className={cn("border-t border-[#e8ecf2] p-4 flex flex-col gap-3", isCollapsed ? "items-center" : "")}>
        {!isCollapsed && userEmail && (
          <div className="flex flex-col px-1">
            <span className="text-sm font-semibold text-[#0f1d33] truncate">
              {userName || 'User'}
            </span>
            <span className="text-xs text-[#5a6a82] truncate">
              {userEmail}
            </span>
          </div>
        )}
        
        {isCollapsed && userEmail && (
          <div 
            className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold shrink-0 mx-auto"
            title={userEmail}
          >
            {(userName || userEmail).charAt(0).toUpperCase()}
          </div>
        )}

        <button
          onClick={() => logout()}
          className={cn(
            "group flex items-center rounded-md font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors",
            isCollapsed ? "p-2.5 justify-center" : "w-full px-3 py-2.5 text-sm"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("flex-shrink-0 text-red-600", isCollapsed ? "h-6 w-6" : "mr-3 h-5 w-5")} aria-hidden="true" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
