'use client';

import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, Users, X, type LucideIcon } from 'lucide-react';
import { toggleModuleRoleAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/it/modules/actions';

interface CustomerModuleEntry {
  mod: any;
  icon: LucideIcon;
  label: string;
}

/**
 * One card for all five Customer pages instead of five near-identical
 * ones. Each of those modules has exactly one possible audience — the
 * Customer role, nothing else — so ModuleCard's role-picker modal was
 * always rendering a single checkbox per card. Same card/modal shell as
 * ModuleCard, just one row per PAGE instead of one row per role.
 */
export function CustomerModuleGroup({ entries, onUpdate }: { entries: CustomerModuleEntry[]; onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isEnabled = (mod: any) => (mod.enabled_roles || []).includes('customer');

  const handleOpenModal = () => {
    setActiveKeys(entries.filter((e) => isEnabled(e.mod)).map((e) => e.mod.module_key));
    setIsModalOpen(true);
  };

  const toggleKey = (key: string) => {
    setActiveKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const saveConfiguration = async () => {
    setSaving(true);
    const changed = entries.filter((e) => activeKeys.includes(e.mod.module_key) !== isEnabled(e.mod));
    const res = await Promise.all(changed.map((e) => toggleModuleRoleAction(e.mod.id, activeKeys.includes(e.mod.module_key) ? ['customer'] : [])));
    if (res.every((r) => r.success)) {
      onUpdate();
      setIsModalOpen(false);
    } else {
      alert('Error saving configuration');
    }
    setSaving(false);
  };

  return (
    <>
      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <h3 className="font-bold text-[#0f1d33]">Customer</h3>
            <p className="text-xs text-[#5a6a82]">{entries.length} pages</p>
          </div>
        </div>
        <p className="text-sm text-[#5a6a82] mb-6 flex-1">Which pages Customer accounts are allowed to open.</p>

        <div className="mb-4">
          <p className="text-xs font-semibold text-[#0f1d33] mb-2 uppercase tracking-wider">Enabled Pages:</p>
          <div className="flex flex-wrap gap-2">
            {entries.every((e) => !isEnabled(e.mod)) ? (
              <span className="text-xs text-[#a0abbb] italic">No pages enabled</span>
            ) : (
              entries
                .filter((e) => isEnabled(e.mod))
                .map((e) => (
                  <span key={e.mod.module_key} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {e.label}
                  </span>
                ))
            )}
          </div>
        </div>

        <button onClick={handleOpenModal} className="w-full py-2.5 rounded-lg border border-[#e8ecf2] text-[#1e3a5f] font-semibold text-sm hover:bg-[#f3f5f8] transition-colors mt-auto">
          Configure Module Access
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0f1d33]/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] shrink-0">
              <h3 className="font-bold text-[#0f1d33] text-lg">Enable Customer Pages</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#a0abbb] hover:text-[#0f1d33] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto min-h-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start mb-6 text-amber-800 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Toggle which pages Customer accounts can open.</p>
              </div>

              <div className="space-y-3">
                {entries.map(({ mod, icon: Icon, label }) => {
                  const isChecked = activeKeys.includes(mod.module_key);
                  return (
                    <label
                      key={mod.module_key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                        isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#e8ecf2] hover:bg-[#f3f5f8]'
                      }`}
                    >
                      <span className={`text-sm font-medium flex items-center gap-2 ${isChecked ? 'text-emerald-800' : 'text-[#0f1d33]'}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </span>
                      <div className="relative flex items-center">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleKey(mod.module_key)} className="sr-only" />
                        <div className={`w-11 h-6 rounded-full transition-colors ${isChecked ? 'bg-emerald-500' : 'bg-[#d1d5db]'}`}>
                          <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-[#e8ecf2] bg-[#f7f8fa] flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-[#5a6a82] hover:bg-[#e8ecf2] rounded-lg transition-colors" disabled={saving}>
                Cancel
              </button>
              <button onClick={saveConfiguration} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#1e3a5f] rounded-lg shadow hover:bg-[#0f1d33] transition-colors">
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
