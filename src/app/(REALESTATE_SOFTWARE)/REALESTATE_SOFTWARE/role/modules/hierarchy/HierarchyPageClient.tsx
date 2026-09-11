'use client';

import React, { useEffect, useState } from 'react';
import { Network, Loader2, ChevronRight } from 'lucide-react';
import HierarchyGraph from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/HierarchyGraph';
import { getWingLineageAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/actions';

interface Person {
  id: string;
  full_name: string;
  role: string;
  roleLabel: string;
  is_active?: boolean;
}

/**
 * Two modes, one page:
 *  - no focusUserId: the whole company, auto-expanded (the original view).
 *  - focusUserId set (?focus=<id> from the User Management actions column):
 *    the same graph, expanded straight down to that one person and
 *    highlighting them, with their wing spelled out in the header.
 */
export default function HierarchyPageClient({ focusUserId }: { focusUserId?: string }) {
  const [loading, setLoading] = useState(Boolean(focusUserId));
  const [expandPath, setExpandPath] = useState<string[]>([]);
  const [ancestors, setAncestors] = useState<Person[]>([]);
  const [self, setSelf] = useState<Person | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Held in state, never built inline in JSX. HierarchyGraph keys its
  // rebuild useCallback on this identity and its render effect depends on
  // both — so a fresh Set every render means new callback, effect refires,
  // re-render, forever. Same reason VisualizePayoutClient keeps it in state.
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!focusUserId) return;
    let cancelled = false;
    (async () => {
      const res = await getWingLineageAction(focusUserId);
      if (cancelled) return;
      if (res.success) {
        setExpandPath(res.expandPath);
        setAncestors(res.ancestors);
        setSelf(res.self);
        setReportCount(res.directReportCount);
        if (res.self) setHighlightIds(new Set([res.self.id]));
      } else {
        setError(res.error || 'Could not load this person.');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [focusUserId]);

  // Root-first, so it reads the way an org chart does: Company > GC > ... > them.
  const wing = [...ancestors].reverse();

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#f7f8fa]">
      <div className="px-4 py-3 border-b border-[#e8ecf2] bg-white flex items-center gap-2 shrink-0 overflow-hidden">
        <Network className="w-5 h-5 text-[#c4a55a] shrink-0" />
        <h1 className="text-base font-bold text-[#0f1d33] shrink-0">
          {focusUserId ? 'Reporting Line' : 'Company Hierarchy'}
        </h1>
        {!focusUserId && (
          <p className="text-xs text-[#5a6a82] ml-2 truncate hidden md:block">Click a card to expand its team.</p>
        )}
        {focusUserId && loading && (
          <span className="text-xs text-[#5a6a82] ml-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </span>
        )}
        {focusUserId && error && <span className="text-xs text-red-600 ml-2 truncate">{error}</span>}
      </div>

      {focusUserId && self && !loading && (
        <div className="px-4 py-2.5 bg-white border-b border-[#e8ecf2] shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
            {wing.length === 0 ? (
              <span className="text-[#5a6a82]">
                <span className="font-bold text-[#0f1d33]">{self.full_name}</span> sits at the top of the tree — nobody above them.
              </span>
            ) : (
              <>
                {wing.map((p) => (
                  <React.Fragment key={p.id}>
                    <span className="text-[#5a6a82]">
                      {p.full_name} <span className="text-[#a0abbb]">({p.roleLabel})</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-[#c4a55a] shrink-0" />
                  </React.Fragment>
                ))}
                <span className="font-bold text-[#0f1d33] bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                  {self.full_name} <span className="font-normal text-[#5a6a82]">({self.roleLabel})</span>
                </span>
              </>
            )}
            <span className="ml-3 text-[#5a6a82] border-l border-[#e8ecf2] pl-3">
              {reportCount === 0 ? 'No one reports to them' : `${reportCount} direct report${reportCount === 1 ? '' : 's'}`}
            </span>
            {self.is_active === false && (
              <span className="ml-3 text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Inactive — their line above is shown here, but the chart below draws active people only
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {focusUserId ? (
          !loading && self && <HierarchyGraph expandPath={expandPath} highlightIds={highlightIds} />
        ) : (
          <HierarchyGraph autoExpandAll />
        )}
      </div>
    </div>
  );
}
