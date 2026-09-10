'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMyNavModulesAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules';
import { PAGE_MODULES } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/page-modules';
import { IndianRupee, FileText, ClipboardList, Phone, Settings, LogOut, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

/** Every Customer page is switchable from the Modules page. Settings
 * included — note that switching it off also removes their only way to
 * change their own password. */
const NAV_ITEMS = [
  { path: '/payment', label: 'Payment', icon: IndianRupee, exact: true, moduleKey: PAGE_MODULES.customerPayment },
  { path: '/documents', label: 'Documents', icon: FileText, moduleKey: PAGE_MODULES.customerDocuments },
  { path: '/registration-status', label: 'Registration Status', icon: ClipboardList, moduleKey: PAGE_MODULES.customerRegistrationStatus },
  { path: '/contact', label: 'Contact', icon: Phone, moduleKey: PAGE_MODULES.customerContact },
  { path: '/settings', label: 'Settings', icon: Settings, moduleKey: PAGE_MODULES.customerSettings },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pageModules, setPageModules] = useState<Record<string, boolean>>({});
  const pathname = usePathname() || '';

  useEffect(() => {
    getMyNavModulesAction().then(setPageModules);
  }, []);

  const navItems = NAV_ITEMS.filter((i) => !i.moduleKey || pageModules[i.moduleKey] !== false);
  const basePath = '/REALESTATE_SOFTWARE/role/Customer';

  const isActive = (path: string, exact?: boolean) => {
    const full = `${basePath}${path}`;
    return exact ? pathname === full : pathname.startsWith(full);
  };

  return (
    <div className="flex h-screen bg-[#f7f8fa] overflow-hidden">
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e8ecf2] flex items-center justify-between px-4 z-50">
        <img src="/logo.png" alt="Bhuwanta Developers" className="h-8 w-auto object-contain" />
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-[#5a6a82] hover:bg-[#f3f5f8] rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {isMobileOpen && <div className="md:hidden fixed inset-0 bg-[#0f1d33]/50 z-40 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-white border-r border-[#e8ecf2] flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-56'}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 absolute right-2 top-[62px] bg-white border border-[#e8ecf2] rounded-full text-[#5a6a82] hover:text-[#c4a55a] hover:border-[#c4a55a] hover:shadow-md transition-all shadow-sm z-50"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 ml-0.5" /> : <ChevronLeft className="w-4 h-4 mr-0.5" />}
        </button>

        <div className={`p-4 border-b border-[#e8ecf2] flex items-center h-[76px] ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {isCollapsed ? (
            <img
              src="/logo-icon.png"
              alt="Bhuwanta"
              title="Bhuwanta"
              className="w-10 h-10 object-contain brightness-0 animate-in fade-in duration-300"
            />
          ) : (
            <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-300 text-center">
              <img src="/logo.png" alt="Bhuwanta Developers" className="h-9 w-auto object-contain mx-auto" />
              <p className="text-[10px] text-[#5a6a82] mt-1 font-bold uppercase tracking-widest">Role : Customer</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = `${basePath}${item.path}`;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group ${
                  active ? 'text-[#1e3a5f] bg-[#1e3a5f]/10' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
                }`}
                title={item.label}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#e8ecf2] shrink-0 flex flex-col gap-2">
          <Link href="/REALESTATE_SOFTWARE/login" className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors" title="Sign Out">
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
