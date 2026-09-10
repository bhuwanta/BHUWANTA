'use client';

import React from 'react';
import { Network } from 'lucide-react';
import HierarchyGraph from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/HierarchyGraph';

export default function HierarchyPageClient() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#f7f8fa]">
      <div className="px-4 py-3 border-b border-[#e8ecf2] bg-white flex items-center gap-2 shrink-0 overflow-hidden">
        <Network className="w-5 h-5 text-[#c4a55a] shrink-0" />
        <h1 className="text-base font-bold text-[#0f1d33] shrink-0">Company Hierarchy</h1>
        <p className="text-xs text-[#5a6a82] ml-2 truncate hidden md:block">Click a card to expand its team.</p>
      </div>
      <div className="flex-1 min-h-0">
        <HierarchyGraph autoExpandAll />
      </div>
    </div>
  );
}
