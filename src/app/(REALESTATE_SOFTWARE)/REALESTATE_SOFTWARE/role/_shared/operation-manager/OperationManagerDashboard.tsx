'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Landmark, CheckCircle2, Loader2 } from 'lucide-react';
import { getOperationManagerDashboardStatsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/operation-manager/actions';

export default function OperationManagerDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getOperationManagerDashboardStatsAction>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStats(await getOperationManagerDashboardStatsAction());
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0f1d33]">Dashboard</h1>
        <p className="text-[#5a6a82] text-sm mt-1">Company-wide approval queue — Registrations and Payouts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Registrations Awaiting Done" value={stats.pendingRegistrations} accent={stats.pendingRegistrations > 0} />
        <StatCard icon={Landmark} label="Payouts Awaiting Approval" value={stats.pendingPayouts} accent={stats.pendingPayouts > 0} />
        <StatCard icon={CheckCircle2} label="Registrations Done" value={stats.registrationsDone} />
        <StatCard icon={CheckCircle2} label="Payouts Completed" value={stats.payoutsCompleted} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
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
