'use client';

import React, { useEffect, useState } from 'react';
import { Network, Loader2 } from 'lucide-react';
import HierarchyGraph from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/HierarchyGraph';
import { getWingLineageAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/hierarchy/actions';

/**
 * Two modes, one page:
 *  - no focusUserId: the whole company, auto-expanded (the original view).
 *  - focusUserId set (?focus=<id> from the User Management actions column):
 *    the same graph, expanded straight down to that one person and
 *    highlighting them.
 *
 * There is deliberately no text breadcrumb of the reporting line. The
 * chart already draws it — including deactivated people, greyed and
 * dashed — so repeating it as a row of text above was duplicate
 * information taking up vertical space the graph wanted.
 */
export default function HierarchyPageClient({ focusUserId }: { focusUserId?: string }) {
  const [loading, setLoading] = useState(Boolean(focusUserId));
  const [expandPath, setExpandPath] = useState<string[]>([]);
  const [name, setName] = useState<string | null>(null);
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
      if (res.success && res.self) {
        setExpandPath(res.expandPath);
        setName(res.self.full_name);
        setHighlightIds(new Set([res.self.id]));
      } else {
        setError(res.error || 'Could not load this person.');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [focusUserId]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#f7f8fa]">
      <div className="px-4 py-3 border-b border-[#e8ecf2] bg-white flex items-center gap-2 shrink-0 overflow-hidden">
        <Network className="w-5 h-5 text-[#c4a55a] shrink-0" />
        <h1 className="text-base font-bold text-[#0f1d33] shrink-0">
          {focusUserId ? 'Reporting Line' : 'Company Hierarchy'}
        </h1>
        {focusUserId && name && !loading && (
          <span className="text-xs text-[#5a6a82] ml-1 truncate">— {name}</span>
        )}
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

      <div className="flex-1 min-h-0">
        {focusUserId ? (
          !loading && !error && <HierarchyGraph expandPath={expandPath} highlightIds={highlightIds} />
        ) : (
          <HierarchyGraph autoExpandAll />
        )}
      </div>
    </div>
  );
}
