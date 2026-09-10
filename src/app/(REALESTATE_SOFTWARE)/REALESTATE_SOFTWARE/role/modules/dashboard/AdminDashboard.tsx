'use client';

import React, { useState, useEffect } from 'react';
import { Users, MapPin, Building2, ClipboardList, Clock, CheckCircle2, Ban, IndianRupee, Percent, Loader2, Network } from 'lucide-react';
import { getAdminDashboardStatsAction, getMyEarningsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/dashboard/admin-actions';
import { isCommissionEligible, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

interface AdminDashboardProps {
  currentUserRole: RealEstateRole;
  currentUserId: string;
}

export default function AdminDashboard({ currentUserRole, currentUserId }: AdminDashboardProps) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminDashboardStatsAction>> | null>(null);
  const [earnings, setEarnings] = useState<{ totalEarned: number; totalPaid: number; totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const statsRes = await getAdminDashboardStatsAction();
      setStats(statsRes);

      // IT earns no commission (§3a) — skip the call entirely, not just
      // hide the UI. getMyEarningsAction always returns the verified
      // caller's own earnings — there's no id to pass.
      if (isCommissionEligible(currentUserRole)) {
        const earningsRes = await getMyEarningsAction();
        setEarnings(earningsRes);
      }
      setLoading(false);
    };
    load();
  }, [currentUserRole, currentUserId]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (loading || !stats) {
    return (
      <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1d33]">Dashboard</h1>
          <p className="text-[#5a6a82] text-sm mt-1">System-wide overview.</p>
        </div>
        {currentUserRole === 'it' && (
          <a
            href="/REALESTATE_SOFTWARE/role/hierarchy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold gradient-gold text-white shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-premium"
          >
            <Network className="w-4 h-4" />
            Visualize Hierarchy
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
        <StatCard icon={MapPin} label="Areas" value={stats.totalAreas} />
        <StatCard icon={Building2} label="Projects" value={stats.totalProjects} />
      </div>

      {earnings && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {stats.commissionPercentage != null && <StatCard icon={Percent} label="My Commission" value={`${stats.commissionPercentage}%`} />}
          <StatCard icon={IndianRupee} label="Pending Payout" value={formatCurrency(earnings.totalPending)} />
          <StatCard icon={IndianRupee} label="Paid Out" value={formatCurrency(earnings.totalPaid)} accent />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5">
          <h3 className="font-bold text-[#0f1d33] mb-4">Users by Role</h3>
          {stats.usersByRole.length === 0 ? (
            <p className="text-sm text-[#5a6a82]">No users yet.</p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {stats.usersByRole.map((r: any) => (
                <div key={r.role} className="flex items-center justify-between text-sm">
                  <span className="text-[#0f1d33]">{r.label}</span>
                  <span className="font-semibold text-[#1e3a5f] bg-[#1e3a5f]/10 px-2 py-0.5 rounded">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
