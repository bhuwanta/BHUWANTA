'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Loader2, Clock, CheckCircle2, XCircle, RefreshCw, User, Search, ArrowUp, ArrowDown, ArrowUpDown, Network } from 'lucide-react';
import { getMyPayoutsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/wallet/actions';
import { getSalesRoleOrderAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/commission-rates/actions';
import { getFixedRoleLabelsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/commission-rates/fixed-role-actions';
import { checkMyHierarchyModuleStatusAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/hierarchy/actions';
import { ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

const STATUS_META: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600', icon: Clock },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-600', icon: RefreshCw },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600', icon: XCircle },
};

type SortCol = 'srno' | 'date' | 'project' | 'customer' | 'soldBy' | 'role' | 'percentage' | 'amount' | 'status';

export default function WalletPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [totals, setTotals] = useState({ totalEarned: 0, totalPending: 0, totalCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('srno');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState('');
  // Visualize Hierarchy module (S_modules) — gates whether the Actions
  // column (Visualize Payout, rooted at the viewer's own position) is
  // shown at all. IT/Operation Manager always have it; everyone else is
  // whatever IT has switched on for their role on the Modules page.
  const [hierarchyEnabled, setHierarchyEnabled] = useState(false);
  // ROLE_LABELS only covers the 5 fixed roles + the 8 built-in
  // sales-tier ones — a role renamed (or newly created) via the Roles/
  // Commissions page isn't reflected there, so every label lookup on
  // this page falls back to this dynamic map via roleLabel().
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const roleLabel = (role: string): string => dynamicLabels[role] || ROLE_LABELS[role as RealEstateRole] || role;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [res, roleOrderRes, fixedLabelsRes, moduleRes] = await Promise.all([
        getMyPayoutsAction(),
        getSalesRoleOrderAction(),
        getFixedRoleLabelsAction(),
        checkMyHierarchyModuleStatusAction(),
      ]);
      setHierarchyEnabled(moduleRes.isEnabled);
      if (res.success) {
        setPayouts(res.data);
        setTotals(res.totals);
      } else if (res.error) {
        setError(res.error);
      }
      const mergedLabels: Record<string, string> = {};
      roleOrderRes.data.forEach((r) => {
        mergedLabels[r.role_code] = r.label;
      });
      fixedLabelsRes.data.forEach((r) => {
        mergedLabels[r.role_code] = r.label;
      });
      setDynamicLabels(mergedLabels);
      setLoading(false);
    })();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline" /> : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? payouts.filter((p) => {
        const reg = p.s_new_registrations;
        return [
          reg?.s_projects?.name,
          reg?.s_areas?.name,
          reg?.customer_name,
          reg?.seller?.full_name,
          reg?.seller?.role ? roleLabel(reg.seller.role) : '',
          STATUS_META[p.payout_status]?.label,
        ]
          .filter(Boolean)
          .some((field: string) => String(field).toLowerCase().includes(q));
      })
    : payouts;

  const sorted = [...filtered].sort((a, b) => {
    const ra = a.s_new_registrations;
    const rb = b.s_new_registrations;
    let cmp = 0;
    switch (sortCol) {
      case 'srno':
      case 'date':
        // Server returns newest-first; Sr. No. follows that same order.
        cmp = new Date(rb?.submitted_at || 0).getTime() - new Date(ra?.submitted_at || 0).getTime();
        break;
      case 'project':
        cmp = (ra?.s_projects?.name || '').localeCompare(rb?.s_projects?.name || '');
        break;
      case 'customer':
        cmp = (ra?.customer_name || '').localeCompare(rb?.customer_name || '');
        break;
      case 'soldBy':
        cmp = (ra?.seller?.full_name || '').localeCompare(rb?.seller?.full_name || '');
        break;
      case 'role':
        cmp = (ra?.seller?.role ? roleLabel(ra.seller.role) : '').localeCompare(
          rb?.seller?.role ? roleLabel(rb.seller.role) : ''
        );
        break;
      case 'percentage':
        cmp = Number(a.commission_percentage) - Number(b.commission_percentage);
        break;
      case 'amount':
        cmp = Number(a.amount) - Number(b.amount);
        break;
      case 'status':
        cmp = (a.payout_status || '').localeCompare(b.payout_status || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="p-3 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Wallet className="w-6 h-6 text-[#c4a55a]" />
          My Wallet
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">Every commission line you&apos;ve earned — which sale it came from, who sold it, and how much.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 max-w-xl shrink-0">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 shrink-0">
        <StatCard label="Pending / Processing" value={formatCurrency(totals.totalPending)} />
        <StatCard label="Paid Out" value={formatCurrency(totals.totalCompleted)} accent />
      </div>

      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
        <input
          type="text"
          placeholder="Search project, customer, seller, role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-72 bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
        />
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-[#5a6a82]">
            <Wallet className="w-10 h-10 text-[#e8ecf2] mx-auto mb-3" />
            {searchQuery
              ? 'No payouts match your search.'
              : "No payouts yet — this fills up once a sale you're part of has its Registration marked done."}
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-left border-collapse ">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f3f5f8] text-[#5a6a82] text-xs uppercase tracking-wider font-semibold border-b border-[#e8ecf2] whitespace-nowrap">
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('srno')}>
                    Sr. No. <SortIcon col="srno" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('date')}>
                    Date <SortIcon col="date" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('project')}>
                    Project <SortIcon col="project" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('customer')}>
                    Customer Name <SortIcon col="customer" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('soldBy')}>
                    Sold By <SortIcon col="soldBy" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('role')}>
                    Role <SortIcon col="role" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('percentage')}>
                    My % <SortIcon col="percentage" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('amount')}>
                    Amount <SortIcon col="amount" />
                  </th>
                  <th className="p-2 cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  {hierarchyEnabled && <th className="p-2 text-center select-none">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {sorted.map((p, index) => {
                  const reg = p.s_new_registrations;
                  const seller = reg?.seller;
                  const statusMeta = STATUS_META[p.payout_status] || STATUS_META.pending;
                  const StatusIcon = statusMeta.icon;
                  const wasRounded = Number(p.amount) !== Number(p.computed_amount);
                  return (
                    <tr key={p.id} className="hover:bg-[#f7f8fa] transition-colors">
                      <td className="p-2 text-xs text-[#5a6a82] whitespace-nowrap">{index + 1}</td>
                      <td className="p-2 text-xs text-[#5a6a82] whitespace-nowrap">{reg?.submitted_at ? new Date(reg.submitted_at).toLocaleDateString() : '—'}</td>
                      {/* Every cell stays a single line so row heights
                          never vary — the secondary detail that used to
                          sit underneath (area, the tier subtraction, the
                          rounding note) is now a hover tooltip instead. */}
                      <td className="p-2 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#0f1d33]" title={reg?.s_areas?.name ? `Area: ${reg.s_areas.name}` : undefined}>
                          {reg?.s_projects?.name || '—'}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-[#0f1d33] whitespace-nowrap">{reg?.customer_name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#5a6a82]" />
                          <span className="text-xs text-[#0f1d33]">{seller?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {seller?.role ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#1e3a5f]/10 text-[#1e3a5f]">{roleLabel(seller.role)}</span>
                        ) : (
                          <span className="text-[#a0abbb]">—</span>
                        )}
                      </td>
                      <td
                        className="p-2 text-xs text-[#0f1d33] font-medium whitespace-nowrap"
                        title={
                          Number(p.previous_tier_percentage) > 0
                            ? `${Number(p.tier_percentage)}% − ${Number(p.previous_tier_percentage)}% = ${Number(p.commission_percentage)}%`
                            : undefined
                        }
                      >
                        {Number(p.commission_percentage)}%
                      </td>
                      <td className="p-2 whitespace-nowrap" title={wasRounded ? `Rounded up from ${formatCurrency(Number(p.computed_amount))}` : undefined}>
                        <span className="text-sm font-bold text-[#0f1d33]">{formatCurrency(Number(p.amount))}</span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 ${statusMeta.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusMeta.label}
                        </span>
                      </td>
                      {hierarchyEnabled && (
                        <td className="p-2 text-center whitespace-nowrap">
                          {reg?.id && (
                            <a
                              href={`/REALESTATE_SOFTWARE/role/payouts-visualize?registrationId=${reg.id}&scope=mine`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visualize this sale — your position and what's below it"
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#1e3a5f] transition-colors"
                            >
                              <Network className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5">
      <p className="text-xs text-[#5a6a82] font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? 'text-[#c4a55a]' : 'text-[#0f1d33]'}`}>{value}</p>
    </div>
  );
}
