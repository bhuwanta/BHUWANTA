'use client';

import React, { useEffect, useState } from 'react';
import { IndianRupee, Loader2, CheckCircle2, AlertCircle, Ban, Search, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { getMyRegistrationsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/customer-registrations';
import { markPaymentPaidAction, cancelRegistrationAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/registration-status/actions';
import { STATUS_LABEL } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/status-badges';

const PAGE_SIZE = 10;

export default function PaymentPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_registration' | 'registration_done' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const res = await getMyRegistrationsAction();
    if (res.success) setRegistrations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const formatPrice = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const handlePay = async (id: string) => {
    const confirmed = window.confirm('This is a manual payment confirmation — no real gateway is charged. Confirm that payment has been made outside this app?');
    if (!confirmed) return;
    setBusyId(id);
    setMessage(null);
    const res = await markPaymentPaidAction(id);
    setMessage(res.success ? { type: 'success', text: res.message! } : { type: 'error', text: res.error! });
    if (res.success) load();
    setBusyId(null);
  };

  const handleCancel = async (id: string) => {
    const confirmed = window.confirm("Decline this payment? This cancels the registration and cannot be undone. Once you've paid, it can no longer be cancelled here.");
    if (!confirmed) return;
    setBusyId(id);
    setMessage(null);
    const res = await cancelRegistrationAction(id);
    setMessage(res.success ? { type: 'success', text: res.message! } : { type: 'error', text: res.error! });
    if (res.success) load();
    setBusyId(null);
  };

  const byStatus = statusFilter === 'all' ? registrations : registrations.filter((r) => r.status === statusFilter);
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? byStatus.filter((r) => [r.s_projects?.name, r.s_areas?.name].filter(Boolean).some((field: string) => String(field).toLowerCase().includes(q)))
    : byStatus;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-[#c4a55a]" />
            Payment
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Every booking of yours, with its payment status — confirm payment before a registration can be finalized.</p>
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
          <input
            type="text"
            placeholder="Search area, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-72 bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
          />
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 shrink-0 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{message.text}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 bg-white p-1.5 rounded-xl border border-[#e8ecf2] shadow-sm shrink-0 max-w-full overflow-x-auto">
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

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 overflow-auto min-h-0">
        <table className="w-full min-w-[900px] text-left border-collapse table-fixed">
          <thead className="bg-[#f7f8fa] sticky top-0 z-10 shadow-[0_1px_0_#e8ecf2]">
            <tr className="text-[12px] uppercase tracking-wider text-[#5a6a82]">
              <th className="py-3 px-3 font-semibold w-12">#</th>
              <th className="py-3 px-3 font-semibold w-[16%]">Area</th>
              <th className="py-3 px-3 font-semibold w-[22%]">Project</th>
              <th className="py-3 px-3 font-semibold w-[9%]">Sq.yds</th>
              <th className="py-3 px-3 font-semibold w-[14%]">Amount to be Paid</th>
              <th className="py-3 px-3 font-semibold w-[8%] text-center">Paid</th>
              <th className="py-3 px-3 font-semibold w-[10%] text-center">Registration</th>
              <th className="py-3 px-3 font-semibold text-right w-[22%]">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#0f1d33] divide-y divide-[#e8ecf2]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a] mx-auto mb-2" />
                  <p className="text-[#5a6a82] text-sm">Loading...</p>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-[#5a6a82]">
                  {searchQuery ? 'No bookings match your search.' : 'Nothing here yet.'}
                </td>
              </tr>
            ) : (
              paginated.map((reg, index) => {
                const canAct = reg.status === 'pending_registration' && reg.payment_status !== 'paid';
                const isCancelled = reg.status === 'cancelled';
                const isRejected = reg.payment_status === 'rejected';
                return (
                  <tr key={reg.id} className="hover:bg-[#f3f5f8] transition-colors">
                    <td className="py-2.5 px-3 text-[#5a6a82] align-top">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="py-2.5 px-3 truncate align-top" title={reg.s_areas?.name}>
                      {reg.s_areas?.name || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold align-top">
                      <div className="truncate" title={reg.s_projects?.name}>{reg.s_projects?.name || '—'}</div>
                      {isRejected && (
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] font-normal text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>
                            <span className="font-semibold">Payment not verified.</span>{' '}
                            {reg.payment_rejection_note ? `${reg.payment_rejection_note} — ` : ''}
                            Please pay again and re-confirm.
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap align-top">{reg.plot_size_sqyd}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold align-top">{formatPrice(reg.totalAmount)}</td>
                    <td className="py-2.5 px-3 text-center align-top">
                      {isCancelled || isRejected ? (
                        <X className="w-4 h-4 text-red-500 inline" />
                      ) : reg.payment_status === 'paid' ? (
                        <Check className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <span className="text-[#a0abbb]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center align-top">
                      {isCancelled ? (
                        <X className="w-4 h-4 text-red-500 inline" />
                      ) : reg.status === 'registration_done' ? (
                        <Check className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <span className="text-[#a0abbb]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right align-top">
                      {canAct ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCancel(reg.id)}
                            disabled={busyId === reg.id}
                            className="text-red-500 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                          <button
                            onClick={() => handlePay(reg.id)}
                            disabled={busyId === reg.id}
                            className="gradient-gold text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {busyId === reg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <IndianRupee className="w-3.5 h-3.5" />}
                            Pay Now
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#a0abbb] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 shrink-0 text-sm text-[#5a6a82]">
          <p>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-[#e8ecf2] bg-white text-[#5a6a82] hover:bg-[#f3f5f8] disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[#0f1d33] px-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-[#e8ecf2] bg-white text-[#5a6a82] hover:bg-[#f3f5f8] disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
