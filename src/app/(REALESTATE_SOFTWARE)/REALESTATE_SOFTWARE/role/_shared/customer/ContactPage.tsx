'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Loader2, User, PhoneCall } from 'lucide-react';
import { getMyRegistrationsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/customer-registrations';

export default function ContactPage() {
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
            <Phone className="w-6 h-6 text-[#c4a55a]" />
            Contact
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Whoever sold to you, for each of your bookings.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center text-[#5a6a82]">No bookings yet.</div>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg) => (
              <div key={reg.id} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#5a6a82]">{reg.s_projects?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-[#1e3a5f]" />
                    <span className="font-bold text-[#0f1d33]">{reg.seller?.full_name || '—'}</span>
                  </div>
                </div>
                {reg.seller?.phone && (
                  <a href={`tel:${reg.seller.phone}`} className="gradient-gold text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm inline-flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" />
                    {reg.seller.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
