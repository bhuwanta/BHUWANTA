'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Loader2, Clock, CheckCircle2, RefreshCw, XCircle, User, MapPin, ShoppingBag, Search, Calendar, Network, Maximize2, X, Building2 } from 'lucide-react';
import { getAllPayoutsAction, markPayoutCompletedAction, type SaleTotals } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/payouts/actions';
import MultiSelectFilter from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/components/MultiSelectFilter';
import { getSalesRoleOrderAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/actions';
import { getFixedRoleLabelsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/fixed-role-actions';
import { ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

const STATUS_META: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600', icon: Clock },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-600', icon: RefreshCw },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600', icon: XCircle },
};

interface PayoutsPageProps {
  /** IT and Operation Manager both get the per-transaction Visualize
   * button (role/payouts-visualize's own requireAnyRole matches this).
   * CEO/GC routes omit this prop, so the button stays hidden for them. */
  currentUserRole?: RealEstateRole;
}

const CAN_VISUALIZE_PAYOUT: RealEstateRole[] = ['it', 'operation_manager'];

export default function PayoutsPage({ currentUserRole }: PayoutsPageProps = {}) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [saleTotals, setSaleTotals] = useState<Record<string, SaleTotals>>({});
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  // 'single' shows one date input and filters to exactly that day;
  // 'range' shows two and filters inclusively between them. Compared as
  // plain yyyy-mm-dd strings against submitted_at's own date portion —
  // sales stay listed newest-first regardless (sortDir is fixed now that
  // this replaces the old manual sort toggle).
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const sortDir: 'asc' | 'desc' = 'asc';
  const [markingId, setMarkingId] = useState<string | null>(null);
  // Only one sale's detail is ever open at a time — the Expand action
  // opens it as a popup rather than inline, so there's no need for a Set
  // of open ids any more.
  const [detailRegId, setDetailRegId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Bottom-to-top rank of the commission chain — used to order each
  // sale's payout lines seller-first-up-to-CEO regardless of the order
  // rows happened to be inserted/returned in, so the tree always reads
  // as a real flow: whoever closed the sale at the bottom, CEO at the
  // top. Built from the real, current sales-tier cascade (built-in +
  // any admin-created roles) via getSalesRoleOrderAction — that order
  // is top-to-bottom (Director-first), so it's reversed here and
  // governing_council/ceo appended, same shape as the old hardcoded
  // CHAIN_RANK array this replaces.
  const [chainRank, setChainRank] = useState<string[]>([]);
  // ROLE_LABELS only covers the 5 fixed roles + the 8 built-in
  // sales-tier ones — a role created via Commission Rates isn't in it,
  // so every label lookup in this file falls back to this dynamic map
  // (populated from the same getSalesRoleOrderAction call) via the
  // roleLabel() helper below.
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [payoutsRes, roleOrderRes, fixedLabelsRes] = await Promise.all([getAllPayoutsAction(), getSalesRoleOrderAction(), getFixedRoleLabelsAction()]);
    if (payoutsRes.success) {
      setPayouts(payoutsRes.data);
      setSaleTotals(payoutsRes.saleTotals);
      setCanApprove(payoutsRes.canApprove);
    } else if (payoutsRes.error) {
      setError(payoutsRes.error);
    }
    setChainRank([...roleOrderRes.data.map((r) => r.role_code)].reverse().concat(['governing_council', 'ceo']));
    const mergedLabels: Record<string, string> = {};
    roleOrderRes.data.forEach((r) => {
      mergedLabels[r.role_code] = r.label;
    });
    fixedLabelsRes.data.forEach((r) => {
      mergedLabels[r.role_code] = r.label;
    });
    setDynamicLabels(mergedLabels);
    setLoading(false);
  };

  // dynamicLabels checked first — see the identical comment in
  // CommissionRatesPage.tsx's roleLabel(): the 8 built-in sales-tier
  // roles already have a static ROLE_LABELS entry, which would
  // otherwise always shadow a rename made on the Roles/Commissions page.
  const roleLabel = (role: string): string => dynamicLabels[role] || ROLE_LABELS[role as RealEstateRole] || role;

  useEffect(() => {
    load();
  }, []);

  const handleMarkPaid = async (id: string) => {
    const confirmed = window.confirm('Confirm this payout has actually been transferred? This marks it completed and cannot be undone.');
    if (!confirmed) return;
    setMarkingId(id);
    const res = await markPayoutCompletedAction(id);
    if (res.success) load();
    else alert(res.error);
    setMarkingId(null);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // Group every payout line by the sale (registration) it came from — a
  // sale is one seller closing one plot; the whole upline chain that
  // gets paid on it (seller through CEO) belongs together, not scattered
  // across unrelated flat rows.
  type SaleGroup = { registration: any; lines: any[] };
  const groupsMap = new Map<string, SaleGroup>();
  payouts.forEach((p) => {
    const reg = p.s_new_registrations;
    const regId = reg?.id || 'unknown';
    if (!groupsMap.has(regId)) groupsMap.set(regId, { registration: reg, lines: [] });
    groupsMap.get(regId)!.lines.push(p);
  });

  // Every area/project name that actually appears in the loaded sales —
  // the filter options are exactly what's filterable, never a name with
  // zero matching sales.
  const areaOptions = Array.from(new Set(Array.from(groupsMap.values()).map((g) => g.registration?.s_areas?.name).filter(Boolean))).sort();
  const projectOptions = Array.from(new Set(Array.from(groupsMap.values()).map((g) => g.registration?.s_projects?.name).filter(Boolean))).sort();

  const matchesFilter = (status: string) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return status === 'pending' || status === 'processing';
    return status === 'completed';
  };

  const saleGroups = Array.from(groupsMap.values())
    .map((group) => {
      // Seller's own line is always rank 0 in their own chain by
      // definition (everyone else present outranks them) — so after this
      // sort, index 0 is always the seller, and the list reads bottom-up
      // through the real hierarchy ending at CEO. previousRoleLabel is
      // attached here so the "X% − Y%" caption can name the real role
      // compared against, straight from the DB role field.
      //
      // IMPORTANT: this full chain is never filtered down by status — a
      // sale's tree always shows every real participant. The status
      // filter only decides which SALES appear in the list below (a sale
      // shows under "Completed" once at least one of its lines is), never
      // which lines within an already-expanded sale are visible. Hiding
      // individual lines by status broke "who's the seller" (whichever
      // line happened to survive the filter became index 0), so identity
      // is now read from previous_tier_percentage === 0 — a real DB fact,
      // not an array position — and every line always renders.
      const lines = group.lines
        .slice()
        .sort((a, b) => chainRank.indexOf(a.role) - chainRank.indexOf(b.role))
        .map((p, i, arr) => ({
          ...p,
          previousRoleLabel: i === 0 ? null : roleLabel(arr[i - 1].role),
          // How many lines on THIS sale share the same role — a
          // 'company_wide_split' role (e.g. several active CEOs)
          // produces one row per holder, each already carrying the
          // divided-down commission_percentage/amount (payout-engine.ts,
          // migration 013). >1 here means the tier's marginal cut was
          // split, not that this person got the full cut. The seller's
          // own line is excluded on both sides, matching how the engine
          // itself excludes it from the split — theirs is a personal
          // full-rate commission, not a share of the role's band.
          splitCount:
            Number(p.previous_tier_percentage) === 0
              ? 1
              : arr.filter((x) => x.role === p.role && Number(x.previous_tier_percentage) !== 0).length,
        }));

      return {
        ...group,
        lines,
        matchesCurrentFilter: lines.some((p) => matchesFilter(p.payout_status)),
        // Both figures come straight from the server (getAllPayoutsAction's
        // saleTotals) — never summed/counted here.
        totals: saleTotals[group.registration?.id] || { totalDistributed: 0, pendingCount: 0, lineCount: group.lines.length },
      };
    })
    .filter((g) => g.matchesCurrentFilter)
    .filter((g) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const reg = g.registration;
      // Matches on the sale itself OR on anyone in its payout chain, so
      // searching a payee's name surfaces the sale they were paid on.
      return [
        reg?.s_projects?.name,
        reg?.s_areas?.name,
        reg?.customer_name,
        reg?.seller?.full_name,
        reg?.seller?.role ? roleLabel(reg.seller.role) : '',
        ...g.lines.map((p: any) => p.payee?.full_name),
        ...g.lines.map((p: any) => roleLabel(p.role)),
      ]
        .filter(Boolean)
        .some((field: string) => String(field).toLowerCase().includes(q));
    })
    .filter((g) => {
      if (!dateFrom) return true;
      const submitted = g.registration?.submitted_at;
      if (!submitted) return false;
      // Local-date portion only (not a UTC slice) — a sale submitted late
      // at night shouldn't fall on "the wrong day" for whoever's
      // filtering by their own calendar date.
      const d = new Date(submitted);
      const saleDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateMode === 'single') return saleDate === dateFrom;
      if (saleDate < dateFrom) return false;
      if (dateTo && saleDate > dateTo) return false;
      return true;
    })
    .filter((g) => selectedAreas.length === 0 || selectedAreas.includes(g.registration?.s_areas?.name))
    .filter((g) => selectedProjects.length === 0 || selectedProjects.includes(g.registration?.s_projects?.name))
    .sort((a, b) => {
      const cmp = new Date(b.registration?.submitted_at || 0).getTime() - new Date(a.registration?.submitted_at || 0).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const detailGroup = detailRegId ? saleGroups.find((g) => g.registration?.id === detailRegId) : null;

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Landmark className="w-6 h-6 text-[#c4a55a]" />
          Payouts
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">
          {canApprove
            ? "Every sale, with the whole commission chain it triggered. Click Expand to see who's getting paid and mark each line paid once transferred."
            : "Every sale, with the whole commission chain it triggered — read-only. Only the Operation Manager can mark a payout paid."}
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 max-w-xl shrink-0">{error}</div>}

      <div className="mb-4 shrink-0 space-y-3">
        <div className="inline-flex items-center gap-2 bg-white p-1.5 rounded-xl border border-[#e8ecf2] shadow-sm max-w-full overflow-x-auto">
          {(['all', 'pending', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize whitespace-nowrap shrink-0 ${statusFilter === s ? 'bg-[#1e3a5f] text-white shadow' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'}`}
            >
              {s === 'pending' ? 'Pending / Processing' : s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
            <input
              type="text"
              placeholder="Search area, project, customer, seller, payee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#e8ecf2] rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-[#5a6a82] shrink-0" />
            <div className="flex items-center bg-[#f3f5f8] rounded-md p-0.5 mr-1">
              {(['single', 'range'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setDateMode(m);
                    if (m === 'single') setDateTo('');
                  }}
                  className={`px-2 py-1 rounded text-xs font-bold capitalize transition-all ${dateMode === m ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-[#5a6a82]'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title={dateMode === 'single' ? 'Show sales from this day only' : 'Start of the range'}
              className="text-sm text-[#0f1d33] bg-transparent focus:outline-none [color-scheme:light]"
            />
            {dateMode === 'range' && (
              <>
                <span className="text-[#5a6a82] text-sm">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  title="End of the range"
                  className="text-sm text-[#0f1d33] bg-transparent focus:outline-none [color-scheme:light]"
                />
              </>
            )}
            {dateFrom && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                title="Clear date filter"
                className="text-[#5a6a82] hover:text-[#0f1d33] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <MultiSelectFilter icon={MapPin} label="Area" options={areaOptions} selected={selectedAreas} onChange={setSelectedAreas} />
          <MultiSelectFilter icon={Building2} label="Project" options={projectOptions} selected={selectedProjects} onChange={setSelectedProjects} />
        </div>
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : saleGroups.length === 0 ? (
          <div className="p-12 text-center text-[#5a6a82]">
            <Landmark className="w-10 h-10 text-[#e8ecf2] mx-auto mb-3" />
            {searchQuery ? 'No sales match your search.' : 'Nothing here.'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full min-w-[860px] text-sm border-collapse">
              <thead className="sticky top-0 bg-[#f7f8fa] z-10">
                <tr className="border-b border-[#e8ecf2]">
                  <th className="text-left font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3 w-12">Sr.No</th>
                  <th className="text-left font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Area</th>
                  <th className="text-left font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Project</th>
                  <th className="text-left font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Sold By</th>
                  <th className="text-left font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Customer Name</th>
                  <th className="text-right font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Amount</th>
                  <th className="text-center font-semibold text-[#5a6a82] text-xs uppercase tracking-wide px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {saleGroups.map((group, index) => {
                  const reg = group.registration;
                  return (
                    <tr key={reg?.id} className="border-b border-[#e8ecf2] hover:bg-[#f7f8fa] transition-colors">
                      <td className="px-4 py-3 text-[#5a6a82]">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="text-[#0f1d33] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#a0abbb] shrink-0" />
                          {reg?.s_areas?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#0f1d33] font-medium whitespace-nowrap">{reg?.s_projects?.name || 'Unknown project'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[#0f1d33]">{reg?.seller?.full_name || '—'}</span>
                        <span className="text-xs text-[#5a6a82] ml-1">({reg?.seller?.role ? roleLabel(reg.seller.role) : '—'})</span>
                      </td>
                      <td className="px-4 py-3 text-[#0f1d33] whitespace-nowrap">{reg?.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="font-bold text-[#0f1d33]">{formatCurrency(group.totals.totalDistributed)}</p>
                        <p className="text-xs text-[#5a6a82]">
                          {group.totals.lineCount} in chain{group.totals.pendingCount > 0 ? ` · ${group.totals.pendingCount} pending` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {currentUserRole && CAN_VISUALIZE_PAYOUT.includes(currentUserRole) && (
                            <a
                              href={`/REALESTATE_SOFTWARE/role/payouts-visualize?registrationId=${reg?.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visualize who got paid on this sale"
                              className="p-2 rounded-lg border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#1e3a5f] transition-colors shrink-0"
                            >
                              <Network className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setDetailRegId(reg?.id)}
                            title="Expand — see the full commission breakdown"
                            className="p-2 rounded-lg border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#1e3a5f] transition-colors shrink-0"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Expand popup: the full sale tree, one sale at a time ---------- */}
      {detailGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailRegId(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#0f1d33] truncate">{detailGroup.registration?.s_projects?.name || 'Unknown project'}</h3>
                <p className="text-xs text-[#5a6a82] truncate">
                  {detailGroup.registration?.customer_name} · {detailGroup.registration?.plot_size_sqyd} sq.yd
                </p>
              </div>
              <button type="button" onClick={() => setDetailRegId(null)} className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-[#e8ecf2] shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-5">
              {/* Root of the tree: the sale itself. Everything below
                  branches off this one event. */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center w-7 shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="w-0.5 flex-1 bg-[#e8ecf2] my-1 min-h-[16px]" />
                </div>
                <div className="flex-1 pb-1 pt-1">
                  <p className="text-sm font-bold text-[#0f1d33]">
                    {detailGroup.registration?.seller?.full_name} sold {detailGroup.registration?.plot_size_sqyd} sq.yd at {detailGroup.registration?.s_projects?.name}
                  </p>
                  <p className="text-xs text-[#5a6a82]">This is the sale every line below is paid on.</p>
                </div>
              </div>

              {detailGroup.lines.map((p: any, i: number) => {
                const statusMeta = STATUS_META[p.payout_status] || STATUS_META.pending;
                const StatusIcon = statusMeta.icon;
                const wasRounded = Number(p.amount) !== Number(p.computed_amount);
                const isPending = p.payout_status === 'pending' || p.payout_status === 'processing';
                const isLast = i === detailGroup.lines.length - 1;
                // A real DB fact (nobody below them in this chain), not
                // an array position — stays correct regardless of which
                // lines are pending/completed/filtered.
                const isSeller = Number(p.previous_tier_percentage) === 0;

                // The tree always shows the whole real chain — a line
                // that doesn't match the active status tab is dimmed
                // rather than hidden, so it's visible why it's still
                // here.
                const dimmed = !matchesFilter(p.payout_status);

                return (
                  <div key={p.id} className={`flex gap-3 ${dimmed ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col items-center w-7 shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 border-white shadow shrink-0 ${isSeller ? 'bg-[#c4a55a]' : 'bg-[#1e3a5f]'}`} />
                      {!isLast && <div className="w-0.5 flex-1 bg-[#e8ecf2] my-1 min-h-[16px]" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-[11px] text-[#a0abbb] italic mb-1.5">
                        {isSeller ? (
                          <>Made the sale — earns their full {Number(p.tier_percentage)}% {roleLabel(p.role)} rate</>
                        ) : (
                          <>
                            {roleLabel(p.role)} rate {Number(p.tier_percentage)}% − {p.previousRoleLabel} rate {Number(p.previous_tier_percentage)}% ={' '}
                            <span className="font-semibold not-italic text-[#5a6a82]">
                              {Math.round((Number(p.tier_percentage) - Number(p.previous_tier_percentage)) * 100) / 100}%
                            </span>
                            {p.splitCount > 1 && (
                              <>
                                , split equally {p.splitCount} ways among every active {roleLabel(p.role)} ={' '}
                                <span className="font-semibold not-italic text-[#5a6a82]">{Number(p.commission_percentage)}%</span> each
                              </>
                            )}
                          </>
                        )}
                      </p>
                      <div className="bg-white border border-[#e8ecf2] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-[#5a6a82] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0f1d33] truncate">{p.payee?.full_name || '—'}</p>
                            <p className="text-xs text-[#5a6a82]">
                              {roleLabel(p.role)} · {Number(p.commission_percentage)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-[#0f1d33]">{formatCurrency(Number(p.amount))}</p>
                            {wasRounded && <p className="text-[11px] text-[#a0abbb]">rounded up from {formatCurrency(Number(p.computed_amount))}</p>}
                          </div>
                          <span className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${statusMeta.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusMeta.label}
                          </span>
                          {isPending && canApprove && (
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              disabled={markingId === p.id}
                              className="gradient-gold text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                              {markingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

