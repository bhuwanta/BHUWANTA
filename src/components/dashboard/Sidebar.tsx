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
  SlidersHorizontal
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/crm', icon: LayoutDashboard },
  { name: 'Leads', href: '/crm/leads', icon: Users },
  { name: 'WhatsApp', href: '/crm/whatsapp', icon: MessageCircle },
  { name: 'Areas', href: '/crm/areas', icon: MapPin },
  { name: 'Projects', href: '/crm/projects', icon: Building2 },
  { name: 'Brochures', href: '/crm/brochures', icon: FileText },
  { name: 'Layouts', href: '/crm/layouts', icon: Map },
  { name: 'Reports', href: '/crm/reports', icon: LineChart },
  { name: 'Modules', href: '/crm/modules', icon: SlidersHorizontal },
  { name: 'Users', href: '/crm/users', icon: Shield },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  userRole?: string;
}

export function Sidebar({ isCollapsed, toggleCollapse, userRole = 'Admin' }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter(item => {
    if (userRole === 'Telecaller') {
      return item.name === 'Leads';
    }
    return true; // Admin sees everything
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-[#e8ecf2] bg-white">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-[#e8ecf2]", isCollapsed ? "px-0 justify-center" : "px-6 justify-between")}>
        {!isCollapsed && (
          <Link href="/crm" className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#0f1d33]">
            <Building2 className="h-6 w-6 text-[#c4a55a]" />
            <span>Bhuwanta<span className="text-[#c4a55a]">CRM</span></span>
          </Link>
        )}
        <button 
          onClick={toggleCollapse} 
          className={cn("text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] rounded-md p-1.5 transition-colors", isCollapsed && "mx-auto")}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className={cn("flex-1 space-y-1 py-4", isCollapsed ? "px-2" : "px-3")}>
        {filteredNavigation.map((item) => {
          const isActive = item.href === '/crm' 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
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
        })}
      </nav>
      <div className={cn("border-t border-[#e8ecf2] p-4 flex", isCollapsed ? "justify-center" : "")}>
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
