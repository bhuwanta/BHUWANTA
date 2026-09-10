'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Loader2, CheckCircle2, Clock, Ban, AlertCircle, Search, ArrowUp, ArrowDown, ArrowUpDown, BellOff, XCircle, Trash2, Undo2 } from 'lucide-react';
import { getRegistrationsAction, markRegistrationDoneAction, cancelRegistrationAction, markRegistrationsReadAction, markOneRegistrationReadAction, deleteRegistrationAction, undoRegistrationDoneAction, undoPaymentAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/registration-status/actions';
import { notifyRegistrationsChanged } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/events/registrations-notify';
import { getSalesRoleOrderAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/actions';
import { getFixedRoleLabelsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/fixed-role-actions';
import { ROLE_LABELS, isSalesRole, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

interface RegistrationsPageProps {
  currentUserRole: RealEstateRole;
  currentUserId: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending_registration: 'bg-amber-50 text-amber-600',
  registration_done: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  pending_registration: 'Pending',
  registration_done: 'Registration Done',
  cancelled: 'Cancelled',
};

type SortCol = 'srno' | 'project' | 'customer' | 'plotSize' | 'basePrice' | 'soldBy' | 'role' | 'payment' | 'status';

export default function RegistrationsPage({ currentUserRole, currentUserId }: RegistrationsPageProps) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [canMarkDone, setCanMarkDone] = useState(false);
  const [companyWide, setCompanyWide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_registration' | 'registration_done' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('srno');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // ROLE_LABELS only covers the 5 fixed roles + the 8 built-in
  // sales-tier ones — a role renamed (or newly created) via the Roles/
  // Commissions page isn't reflected there, so every label lookup on
  // this page falls back to this dynamic map via roleLabel().
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const roleLabel = (role: string): string => dynamicLabels[role] || ROLE_LABELS[role as RealEstateRole] || role;

  const load = async () => {
    setLoading(true);
    const [res, roleOrderRes, fixedLabelsRes] = await Promise.all([getRegistrationsAction(), getSalesRoleOrderAction(), getFixedRoleLabelsAction()]);
    if (res.success) {
      setRegistrations(res.data);
      setCanMarkDone(res.canMarkDone);
      setCompanyWide(res.companyWide);
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkDone = async (id: string) => {
    const confirmed = window.confirm('Mark this registration as done? This starts the 48-hour commission payout clock and cannot be undone.');
    if (!confirmed) return;

    setMarkingId(id);
    const res = await markRegistrationDoneAction(id);
    if (res.success) {
      load();
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setMarkingId(null);
  };

  const handleCancel = async (id: string) => {
    const confirmed = window.confirm('Cancel this registration? This cannot be undone.');
    if (!confirmed) return;

    setMarkingId(id);
    const res = await cancelRegistrationAction(id);
    if (res.success) {
      load();
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setMarkingId(null);
  };

  // IT-only, permanent — see deleteRegistrationAction's comment for why
  // this is the one place CEO/Governing Council don't share the same
  // capability as IT on this page. Two-step confirm when payouts exist:
  // the first attempt always runs WITHOUT deletePayoutsToo, so the
  // server can tell us exactly how many payout rows (and how many are
  // already paid) are in the way before IT decides whether to take them
  // down too — never silently cascades on the first click.
  const handleDelete = async (id: string, customerName: string) => {
    const confirmed = window.confirm(`Permanently delete the registration for "${customerName}"? This removes it from the database entirely and cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(id);
    let res = await deleteRegistrationAction(id);

    if (!res.success && (res as any).blockedByPayouts) {
      const proceedWithPayouts = window.confirm(
        `${res.error}\n\nDelete the registration AND all ${(res as any).payoutCount} of its payout records? This cannot be undone.`
      );
      if (proceedWithPayouts) {
        res = await deleteRegistrationAction(id, true);
      } else {
        setDeletingId(null);
        return;
      }
    }

    if (res.success) {
      load();
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setDeletingId(null);
  };

  // Operation-Manager-only reversals. Both are deliberately confirmed
  // rather than one-click: undoing a registration deletes its commission
  // payout lines, and the server refuses outright if any were already
  // paid out.
  const handleUndoDone = async (id: string) => {
    const confirmed = window.confirm(
      'Undo this registration? It goes back to Pending and its unpaid commission payouts are removed. This is blocked if any payout has already been paid out.'
    );
    if (!confirmed) return;

    setMarkingId(id);
    const res = await undoRegistrationDoneAction(id);
    if (res.success) {
      load();
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setMarkingId(null);
  };

  const handleUndoPayment = async (id: string) => {
    // The reason is shown to the customer on their own Payment page, so
    // a reversed payment is never an unexplained regression for them.
    const note = window.prompt(
      "Undo this payment? The customer will be told it could not be verified and asked to pay again.\n\nGive a short reason they'll see (e.g. \"cheque bounced\", \"no UTR found\"):"
    );
    if (note === null) return;
    if (!note.trim()) {
      alert('A reason is required — the customer sees it, so they know why their payment was reversed.');
      return;
    }

    setMarkingId(id);
    const res = await undoPaymentAction(id, note);
    if (res.success) {
      load();
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setMarkingId(null);
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    const res = await markRegistrationsReadAction();
    if (res.success) {
      // "Read" is an acknowledgement, not a status change — the row
      // stays exactly where it is, only the unread dot and the sidebar
      // badge change.
      setRegistrations((prev) => prev.map((r) => ({ ...r, isRead: true })));
      notifyRegistrationsChanged();
    } else {
      alert(res.error);
    }
    setMarkingRead(false);
  };

  /** Acknowledges one row — drops the sidebar badge by exactly one. */
  const handleMarkOneRead = async (id: string) => {
    // Optimistic: the dot disappears immediately, restored on failure.
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, isRead: true } : r)));
    const res = await markOneRegistrationReadAction(id);
    if (res.success) {
      notifyRegistrationsChanged();
    } else {
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, isRead: false } : r)));
      alert(res.error);
    }
  };

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

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const byStatus = statusFilter === 'all' ? registrations : registrations.filter((r) => r.status === statusFilter);

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? byStatus.filter((r) =>
        [
          r.s_projects?.name,
          r.s_areas?.name,
          r.customer_name,
          r.customer_phone,
          r.seller?.full_name,
          r.seller?.role ? roleLabel(r.seller.role) : '',
        ]
          .filter(Boolean)
          .some((field: string) => String(field).toLowerCase().includes(q))
      )
    : byStatus;

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'srno':
        // Default order is newest-first from the server; Sr. No. sorts
        // by that same submission time so the numbering stays meaningful.
        cmp = new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        break;
      case 'project':
        cmp = (a.s_projects?.name || '').localeCompare(b.s_projects?.name || '');
        break;
      case 'customer':
        cmp = (a.customer_name || '').localeCompare(b.customer_name || '');
        break;
      case 'plotSize':
        cmp = Number(a.plot_size_sqyd) - Number(b.plot_size_sqyd);
        break;
      case 'basePrice':
        cmp = Number(a.base_price_at_submission) - Number(b.base_price_at_submission);
        break;
      case 'soldBy':
        cmp = (a.seller?.full_name || '').localeCompare(b.seller?.full_name || '');
        break;
      case 'role':
        cmp = (a.seller?.role ? roleLabel(a.seller.role) : '').localeCompare(
          b.seller?.role ? roleLabel(b.seller.role) : ''
        );
        break;
      case 'payment':
        cmp = (a.payment_status || '').localeCompare(b.payment_status || '');
        break;
      case 'status':
        cmp = (a.status || '').localeCompare(b.status || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const unreadCount = registrations.filter((r) => !r.isRead).length;

  // Sales tiers (Director→LIA) get a purely read-only status table — the
  // only actions they'd ever see are "Mark as read" (already covered by
  // the "Mark all as read" button above the table) and Cancel on their
  // own submissions, which leaves the column empty on most rows. Every
  // action in it is independently enforced server-side anyway
  // (verifyCaller + ownership/role checks in actions.ts), so hiding it
  // is presentation-only, not a security boundary.
  const showActions = !isSalesRole(currentUserRole);

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#c4a55a]" />
            Registrations
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">
            {canMarkDone
              ? 'Company-wide oversight of every New Registration. Marking one done starts the 48-hour commission payout clock.'
              : companyWide
                ? 'Company-wide, read-only view of every New Registration. Only the Operation Manager can mark one done.'
                : 'Status of every New Registration submitted by you or your team — read-only.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingRead}
            title="Clears your sidebar notification badge — does not change any registration's status"
            className="shrink-0 flex items-center gap-2 bg-white border border-[#e8ecf2] text-[#0f1d33] px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-[#f3f5f8] transition-colors text-sm disabled:opacity-50 h-fit"
          >
            {markingRead ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 max-w-xl">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 shrink-0">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
          <input
            type="text"
            placeholder="Search project, customer, seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-72 bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-[#e8ecf2] shadow-sm max-w-full overflow-x-auto">
          {(['all', 'pending_registration', 'registration_done', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap shrink-0 ${statusFilter === s ? 'bg-[#1e3a5f] text-white shadow' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'}`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 overflow-auto min-h-0">
        <table className="w-full min-w-[1100px] text-left border-collapse">
          <thead className="bg-[#f7f8fa] sticky top-0 z-10 shadow-[0_1px_0_#e8ecf2]">
            <tr className="text-[10px] uppercase tracking-wide text-[#5a6a82]">
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none text-center" onClick={() => handleSort('srno')}>
                <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap w-full">
                  Sr. No. <SortIcon col="srno" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('project')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Area / Project <SortIcon col="project" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('customer')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Customer <SortIcon col="customer" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('plotSize')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Plot Size <SortIcon col="plotSize" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('basePrice')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Base Price <SortIcon col="basePrice" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('soldBy')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Sold By <SortIcon col="soldBy" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('payment')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Payment Status <SortIcon col="payment" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold cursor-pointer hover:bg-[#e8ecf2] transition-colors select-none" onClick={() => handleSort('status')}>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  Registration Status <SortIcon col="status" />
                </span>
              </th>
              <th className="py-2 px-1.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[11.5px] text-[#0f1d33] divide-y divide-[#e8ecf2]">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a] mx-auto mb-2" />
                  <p className="text-[#5a6a82] text-sm">Loading registrations...</p>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-[#5a6a82]">
                  <ClipboardList className="w-10 h-10 text-[#e8ecf2] mx-auto mb-3" />
                  {searchQuery
                    ? 'No registrations match your search.'
                    : 'No registrations yet. This fills up once sales-tier “New Registration” submissions start coming in.'}
                </td>
              </tr>
            ) : (
              sorted.map((reg, index) => (
                <tr key={reg.id} className={`hover:bg-[#f3f5f8] transition-colors ${!reg.isRead ? 'bg-[#c4a55a]/[0.04]' : ''}`}>
                  <td className="py-1.5 px-1.5 text-[#5a6a82] whitespace-nowrap align-top text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {!reg.isRead && <span title="Unread" className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 align-top">
                    <div className="text-[#5a6a82] text-[10px] whitespace-nowrap">{reg.s_areas?.name || '—'}</div>
                    <div className="font-semibold whitespace-nowrap">{reg.s_projects?.name || '—'}</div>
                  </td>
                  <td className="py-1.5 px-1.5 align-top">
                    <div className="flex flex-col">
                      <span className="font-medium whitespace-nowrap">{reg.customer_name}</span>
                      <span className="text-[10px] text-[#5a6a82] whitespace-nowrap">{reg.customer_phone}</span>
                      {reg.customer_email && <span className="text-[10px] text-[#5a6a82] whitespace-nowrap">{reg.customer_email}</span>}
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 whitespace-nowrap align-top">{reg.plot_size_sqyd}</td>
                  <td className="py-1.5 px-1.5 whitespace-nowrap align-top">{formatCurrency(reg.base_price_at_submission)}</td>
                  <td className="py-1.5 px-1.5 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium whitespace-nowrap">{reg.seller?.full_name || '—'}</span>
                      {reg.seller?.role && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e3a5f]/10 text-[#1e3a5f] whitespace-nowrap">{roleLabel(reg.seller.role)}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-1.5 whitespace-nowrap align-top">
                    {reg.status === 'cancelled' ? (
                      // Nothing is owed on a cancelled sale — showing
                      // "due" here would be wrong. If they'd already
                      // paid, what matters now is the refund.
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">
                          {reg.payment_status === 'paid' ? 'Refund Pending' : 'Cancelled'}
                        </span>
                        {reg.payment_status === 'paid' && <div className="text-[10px] text-[#5a6a82] mt-0.5">{formatCurrency(reg.totalAmount)} to refund</div>}
                      </>
                    ) : (
                      <>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            reg.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : reg.payment_status === 'rejected'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {reg.payment_status === 'paid' ? 'Paid' : reg.payment_status === 'rejected' ? 'Not Verified' : 'Pending'}
                        </span>
                        <div className="text-[10px] text-[#5a6a82] mt-0.5">
                          {reg.payment_status === 'paid' ? formatCurrency(reg.totalAmount) : `${formatCurrency(reg.totalAmount)} due`}
                        </div>
                        {reg.payment_status === 'rejected' && reg.payment_rejection_note && (
                          <div className="text-[10px] text-red-600 mt-0.5 max-w-[160px]" title={reg.payment_rejection_note}>
                            {reg.payment_rejection_note}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 whitespace-nowrap align-top">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1 ${STATUS_BADGE[reg.status]}`}>
                      {reg.status === 'registration_done' && <CheckCircle2 className="w-3 h-3" />}
                      {reg.status === 'pending_registration' && <Clock className="w-3 h-3" />}
                      {reg.status === 'cancelled' && <Ban className="w-3 h-3" />}
                      {STATUS_LABEL[reg.status]}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      {!reg.isRead && (
                        <button
                          onClick={() => handleMarkOneRead(reg.id)}
                          title="Mark as read — clears this from your notification count, doesn't change its status"
                          className="text-[#5a6a82] hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {reg.status === 'pending_registration' && (
                        <>
                          {showActions && reg.submitted_by === currentUserId && (
                            <button
                              onClick={() => handleCancel(reg.id)}
                              disabled={markingId === reg.id}
                              title="Cancel"
                              className="text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canMarkDone && reg.payment_status === 'paid' && (
                            <button
                              onClick={() => handleUndoPayment(reg.id)}
                              disabled={markingId === reg.id}
                              title="Undo payment — use when the customer's payment could not be verified"
                              className="text-[#5a6a82] p-1.5 rounded-lg border border-[#e8ecf2] hover:bg-[#f3f5f8] transition-colors disabled:opacity-50 shrink-0"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canMarkDone && (
                            <button
                              onClick={() => handleMarkDone(reg.id)}
                              disabled={markingId === reg.id || reg.payment_status !== 'paid'}
                              title={reg.payment_status !== 'paid' ? 'Waiting on customer payment' : 'Mark Done'}
                              className="gradient-gold text-white p-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                              {markingId === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </>
                      )}
                      {canMarkDone && reg.status === 'registration_done' && (
                        <button
                          onClick={() => handleUndoDone(reg.id)}
                          disabled={markingId === reg.id}
                          title="Undo registration — reverts to Pending and removes its unpaid commission payouts"
                          className="text-[#5a6a82] p-1.5 rounded-lg border border-[#e8ecf2] hover:bg-[#f3f5f8] transition-colors disabled:opacity-50 shrink-0"
                        >
                          {markingId === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {/* IT-only, works regardless of status — the server
                          blocks it if the sale already has payout rows,
                          so this is safe to always show rather than
                          gating by status here too. */}
                      {currentUserRole === 'it' && (
                        <button
                          onClick={() => handleDelete(reg.id, reg.customer_name)}
                          disabled={deletingId === reg.id}
                          title="Permanently delete from the database"
                          className="text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {deletingId === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
