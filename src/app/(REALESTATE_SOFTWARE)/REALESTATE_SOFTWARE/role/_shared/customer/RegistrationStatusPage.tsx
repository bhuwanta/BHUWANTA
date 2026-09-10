'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Loader2, Check, Clock, Ban } from 'lucide-react';
import { getMyRegistrationsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/customer-registrations';
import { STATUS_BADGE, STATUS_LABEL } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/status-badges';

const STEPS = ['Submitted', 'Payment', 'Registration Done'];

function currentStepIndex(reg: any): number {
  if (reg.status === 'registration_done') return 3;
  if (reg.payment_status === 'paid') return 2;
  return 1;
}

export default function RegistrationStatusPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getMyRegistrationsAction();
      if (res.success) setRegistrations(res.data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#c4a55a]" />
            Registration Status
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Track where your purchase is in the process.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center text-[#5a6a82]">No registrations yet.</div>
        ) : (
          <div className="space-y-5">
            {registrations.map((reg) => {
              const step = currentStepIndex(reg);
              const cancelled = reg.status === 'cancelled';
              return (
                <div key={reg.id} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0f1d33]">{reg.s_projects?.name}</h3>
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${STATUS_BADGE[reg.status]}`}>{STATUS_LABEL[reg.status]}</span>
                  </div>

                  {cancelled ? (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <Ban className="w-4 h-4 shrink-0" />
                      Cancelled on {reg.cancelled_at ? new Date(reg.cancelled_at).toLocaleDateString() : '—'}.
                      {reg.refund_status === 'pending' && ' A refund is pending.'}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {STEPS.map((label, i) => {
                        const done = step > i + 1 || (step === i + 1 && i === STEPS.length - 1 && reg.status === 'registration_done');
                        const active = step === i + 1;
                        return (
                          <React.Fragment key={label}>
                            <div className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  done || active ? 'bg-[#1e3a5f] text-white' : 'bg-[#f3f5f8] text-[#5a6a82]'
                                }`}
                              >
                                {done ? <Check className="w-4 h-4" /> : active ? <Clock className="w-4 h-4" /> : i + 1}
                              </div>
                              <span className={`text-[11px] font-semibold text-center ${done || active ? 'text-[#0f1d33]' : 'text-[#5a6a82]'}`}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-[#1e3a5f]' : 'bg-[#e8ecf2]'}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-[#5a6a82] mt-4">Submitted {new Date(reg.submitted_at).toLocaleDateString()}{reg.registration_done_at && ` · Registration completed ${new Date(reg.registration_done_at).toLocaleDateString()}`}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
