'use client';

import React, { useState, useEffect } from 'react';
import { Users, ClipboardList, Clock, CheckCircle2, Ban, IndianRupee, Percent, Loader2 } from 'lucide-react';
import { getSalesDashboardStatsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/sales-actions';
import { getMyEarningsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/admin-actions';
import { ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

interface SalesDashboardProps {
  currentUserRole: RealEstateRole;
}

export default function SalesDashboard({ currentUserRole }: SalesDashboardProps) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getSalesDashboardStatsAction>> | null>(null);
  const [earnings, setEarnings] = useState<{ totalEarned: number; totalPaid: number; totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [statsRes, earningsRes] = await Promise.all([getSalesDashboardStatsAction(), getMyEarningsAction()]);
      setStats(statsRes);
      setEarnings(earningsRes);
      setLoading(false);
    })();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (loading || !stats) {
    return (
      <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
      </div>
    );
  }

  const hasDownline = currentUserRole !== 'lia';

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0f1d33]">Dashboard</h1>
        <p className="text-[#5a6a82] text-sm mt-1">{hasDownline ? 'Your team and personal overview.' : 'Your personal overview.'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {hasDownline && <StatCard icon={Users} label="My Team" value={stats.downlineCount} />}
        <StatCard icon={ClipboardList} label="Total Registrations" value={stats.totalRegistrations} />
        {stats.commissionPercentage != null && <StatCard icon={Percent} label="My Commission" value={`${stats.commissionPercentage}%`} />}
        {earnings && <StatCard icon={IndianRupee} label="Paid Out To Date" value={formatCurrency(earnings.totalPaid)} accent />}
      </div>

      {earnings && earnings.totalEarned > 0 && (
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5 mb-6 max-w-md">
          <h3 className="font-bold text-[#0f1d33] mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-[#c4a55a]" />
            My Commission
          </h3>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#5a6a82]">Paid out</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(earnings.totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#5a6a82]">Pending disbursement</span>
            <span className="font-semibold text-amber-600">{formatCurrency(earnings.totalPending)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-[#e8ecf2]">
            <span className="text-[#5a6a82]">Total accrued</span>
            <span className="font-semibold text-[#0f1d33]">{formatCurrency(earnings.totalEarned)}</span>
          </div>
          <p className="text-[11px] text-[#a0abbb] mt-3 pt-3 border-t border-[#e8ecf2]">Each payout line is rounded up to the nearest rupee.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasDownline && (
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5">
            <h3 className="font-bold text-[#0f1d33] mb-4">My Team by Role</h3>
            {stats.usersByRole.length === 0 ? (
              <p className="text-sm text-[#5a6a82]">No team members yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {stats.usersByRole.map((r: any) => (
                  <div key={r.role} className="flex items-center justify-between text-sm">
                    <span className="text-[#0f1d33]">{r.label || ROLE_LABELS[r.role as RealEstateRole]}</span>
                    <span className="font-semibold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2 py-0.5 rounded">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5">
          <h3 className="font-bold text-[#0f1d33] mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#c4a55a]" />
            Registrations
          </h3>
          <div className="space-y-3">
            <RegistrationRow icon={Clock} label="Pending" value={stats.registrationCounts.pending_registration} colorClass="text-amber-600 bg-amber-50" />
            <RegistrationRow icon={CheckCircle2} label="Done" value={stats.registrationCounts.registration_done} colorClass="text-emerald-600 bg-emerald-50" />
            <RegistrationRow icon={Ban} label="Cancelled" value={stats.registrationCounts.cancelled} colorClass="text-red-600 bg-red-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${accent ? 'bg-[#c4a55a]/10' : 'bg-[#1e3a5f]/10'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-[#c4a55a]' : 'text-[#1e3a5f]'}`} />
      </div>
      <div>
        <p className="text-xs text-[#5a6a82] font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-[#0f1d33]">{value}</p>
      </div>
    </div>
  );
}

function RegistrationRow({ icon: Icon, label, value, colorClass }: { icon: any; label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm text-[#0f1d33]">{label}</span>
      </div>
      <span className="font-semibold text-[#0f1d33]">{value}</span>
    </div>
  );
}
