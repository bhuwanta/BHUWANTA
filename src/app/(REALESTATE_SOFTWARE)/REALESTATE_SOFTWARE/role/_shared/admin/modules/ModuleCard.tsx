'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldAlert, X, type LucideIcon } from 'lucide-react';
import { toggleModuleRoleAction, getModuleEnabledRolesAction } from './actions';
import { getSalesRoleOrderAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/commission-rates/actions';
import { getFixedRoleLabelsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/commission-rates/fixed-role-actions';

export function ModuleCard({
  mod,
  icon: Icon,
  onUpdate,
  excludeBottomTier,
  includeAdminPeers,
  audience = 'sales',
  dependsOn,
}: {
  mod: any;
  icon: LucideIcon;
  onUpdate: () => void;
  /** Drops the lowest-ranked sales tier (LIA/LA) from the toggle list —
   * for a module whose whole point is acting on a downline, offering it
   * to the one tier that never has one is a dead option. */
  excludeBottomTier?: boolean;
  /** Who this module can be toggled for. 'sales' (default) is the
   * sales cascade; 'customer' is the Customer role alone (its own
   * pages); 'adminPeers' is Company + Governing Council alone (Payouts,
   * which has no sales-tier audience at all). */
  audience?: 'sales' | 'customer' | 'adminPeers';
  /** Another module this one is subordinate to — a role can only be
   * enabled here if it's already enabled there. Settings/Passwords use
   * this: the password controls live inside the Settings page, so
   * granting Passwords to a role with no Settings page would be a dead
   * toggle. Roles missing from the parent are shown locked. */
  dependsOn?: { moduleKey: string; label: string };
  /** Adds Company (ceo) and Governing Council to the toggle list. Most
   * modules (User Management, Passwords) don't need this — IT/CEO/GC
   * already get unconditional access as admin peers (§2 peer rule) at
   * the actual page/action level, so toggling would do nothing. But a
   * few modules (Visualize Hierarchy, Bulk Change Passwords) only
   * unconditionally exempt IT itself — CEO/GC still have to be
   * explicitly enabled here like any sales-tier role, same as this
   * session's live-verified Director test for Bulk Change Passwords. */
  includeAdminPeers?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRoles, setActiveRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // Fetched via getSalesRoleOrderAction (not the old hardcoded
  // SALES_RANK_ORDER) so a newly created role can be toggled on
  // immediately, with no code change. Company/Governing Council are
  // added on top for modules that pass includeAdminPeers — they're not
  // rows in S_role_definitions (no rank concept), so their labels come
  // from getFixedRoleLabelsAction instead.
  const [toggleableRoles, setToggleableRoles] = useState<{ id: string; label: string }[]>([]);
  /** Roles the parent module (dependsOn) allows. null = no dependency,
   * so nothing is locked. */
  const [parentRoles, setParentRoles] = useState<string[] | null>(null);
  /** The sales cascade's role codes. A dependency only ever applies to
   * these: the parent module (Settings) governs sales tiers alone, so
   * Company/Governing Council — who always have Settings — must never
   * be shown locked just because they're absent from its enabled_roles. */
  const [salesRoleCodes, setSalesRoleCodes] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getSalesRoleOrderAction(), getFixedRoleLabelsAction()]).then(([roleOrderRes, fixedLabelsRes]) => {
      setSalesRoleCodes(roleOrderRes.data.map((r) => r.role_code));
      const labelOf = (code: string) => fixedLabelsRes.data.find((r) => r.role_code === code)?.label || code;

      if (audience === 'customer') {
        setToggleableRoles([{ id: 'customer', label: labelOf('customer') }]);
        return;
      }
      if (audience === 'adminPeers') {
        setToggleableRoles([
          { id: 'ceo', label: labelOf('ceo') },
          { id: 'governing_council', label: labelOf('governing_council') },
        ]);
        return;
      }

      // getSalesRoleOrder is highest-rank-first (Director..LIA), so the
      // bottom tier is always the last entry, regardless of how many
      // tiers exist or whether any are admin-created.
      const roles = excludeBottomTier ? roleOrderRes.data.slice(0, -1) : roleOrderRes.data;
      const adminPeerRoles = includeAdminPeers
        ? fixedLabelsRes.data.filter((r) => r.role_code === 'ceo' || r.role_code === 'governing_council').map((r) => ({ id: r.role_code, label: r.label }))
        : [];
      setToggleableRoles([...adminPeerRoles, ...roles.map((r) => ({ id: r.role_code, label: r.label }))]);
    });
  }, [excludeBottomTier, includeAdminPeers, audience]);

  useEffect(() => {
    if (!dependsOn) {
      setParentRoles(null);
      return;
    }
    getModuleEnabledRolesAction(dependsOn.moduleKey).then(setParentRoles);
    // Re-read whenever this card reopens, so enabling Settings for a
    // role in the card next to this one unlocks it here without a
    // full page reload.
  }, [dependsOn, isModalOpen]);

  const handleOpenModal = () => {
    const validRoles = (mod.enabled_roles || []).filter((r: string) => toggleableRoles.some((ar) => ar.id === r));
    setActiveRoles(validRoles);
    setIsModalOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setActiveRoles((prev) => (prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]));
  };

  const saveRoles = async () => {
    setSaving(true);
    // Drop anything the parent module no longer allows — a role could
    // have been enabled here before Settings was switched off for it,
    // and saving would otherwise quietly re-persist a dead grant.
    const toSave = parentRoles === null ? activeRoles : activeRoles.filter((r) => !salesRoleCodes.includes(r) || parentRoles.includes(r));
    const res = await toggleModuleRoleAction(mod.id, toSave);
    if (res.success) {
      onUpdate();
      setIsModalOpen(false);
    } else {
      alert('Error saving roles: ' + res.error);
    }
    setSaving(false);
  };

  return (
    <>
      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#f3f5f8] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <h3 className="font-bold text-[#0f1d33]">{mod.module_name}</h3>
            <p className="text-xs text-[#5a6a82]">Key: {mod.module_key}</p>
          </div>
        </div>
        <p className="text-sm text-[#5a6a82] mb-6 flex-1">{mod.description}</p>

        <div className="mb-4">
          <p className="text-xs font-semibold text-[#0f1d33] mb-2 uppercase tracking-wider">Enabled For Roles:</p>
          <div className="flex flex-wrap gap-2">
            {!mod.enabled_roles || mod.enabled_roles.length === 0 ? (
              <span className="text-xs text-[#a0abbb] italic">No roles enabled</span>
            ) : (
              mod.enabled_roles.map((role: string) => {
                const matchedRole = toggleableRoles.find((r) => r.id === role);
                if (!matchedRole) return null;
                return (
                  <span key={role} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {matchedRole.label}
                  </span>
                );
              })
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
              <h3 className="font-bold text-[#0f1d33] text-lg">Enable {mod.module_name}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#a0abbb] hover:text-[#0f1d33] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto min-h-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start mb-6 text-amber-800 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Toggle which sales-tier roles should have access to the <strong>{mod.module_name}</strong> module.
                </p>
              </div>

              <div className="space-y-3">
                {toggleableRoles.map((role) => {
                  const isChecked = activeRoles.includes(role.id);
                  const isLocked = parentRoles !== null && salesRoleCodes.includes(role.id) && !parentRoles.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isLocked
                          ? 'bg-[#f7f8fa] border-[#e8ecf2] cursor-not-allowed opacity-70'
                          : isChecked
                            ? 'bg-emerald-50 border-emerald-200 cursor-pointer'
                            : 'bg-white border-[#e8ecf2] hover:bg-[#f3f5f8] cursor-pointer'
                      }`}
                      title={isLocked ? `Enable ${dependsOn?.label} for ${role.label} first` : undefined}
                    >
                      <span className={`text-sm font-medium ${isLocked ? 'text-[#a0abbb]' : isChecked ? 'text-emerald-800' : 'text-[#0f1d33]'}`}>
                        {role.label}
                        {isLocked && <span className="block text-[11px] font-normal text-[#a0abbb]">Needs {dependsOn?.label}</span>}
                      </span>
                      <div className="relative flex items-center">
                        <input type="checkbox" checked={isChecked} disabled={isLocked} onChange={() => toggleRole(role.id)} className="sr-only" />
                        <div className={`w-11 h-6 rounded-full transition-colors ${isLocked ? 'bg-[#e8ecf2]' : isChecked ? 'bg-emerald-500' : 'bg-[#d1d5db]'}`}>
                          <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${isChecked && !isLocked ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
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
              <button onClick={saveRoles} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#1e3a5f] rounded-lg shadow hover:bg-[#0f1d33] transition-colors">
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
