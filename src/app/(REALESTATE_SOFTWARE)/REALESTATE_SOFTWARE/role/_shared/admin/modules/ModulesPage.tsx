'use client';

import React, { useState, useEffect } from 'react';
import { Blocks, Users, Key, Network, KeyRound, ClipboardPlus, ClipboardList, Wallet, LayoutDashboard, Map, Landmark, Settings, Building2, IndianRupee, FileText, Phone } from 'lucide-react';
import { getModulesAction, ensurePasswordsModuleExists, ensureUserManagementModuleExists, ensureHierarchyModuleExists, ensureBulkPasswordResetModuleExists, ensureNewRegistrationModuleExists, ensureRegistrationStatusModuleExists, ensureWalletModuleExists, ensurePageModulesExist } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/modules/actions';
import { ModuleCard } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/modules/ModuleCard';
import { CustomerModuleGroup } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/modules/CustomerModuleGroup';

export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    await ensurePasswordsModuleExists();
    await ensureUserManagementModuleExists();
    await ensureHierarchyModuleExists();
    await ensureBulkPasswordResetModuleExists();
    await ensureNewRegistrationModuleExists();
    await ensureRegistrationStatusModuleExists();
    await ensureWalletModuleExists();
    await ensurePageModulesExist();
    const res = await getModulesAction();
    if (res.success) {
      setModules(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col relative">
      <div className="flex flex-col mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Blocks className="w-6 h-6 text-[#c4a55a]" />
          Modules
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">Configure and manage ERP system micro-service modules.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#5a6a82]">Loading modules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.find((m) => m.module_key === 'dashboard') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'dashboard')} icon={LayoutDashboard} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'areas_projects') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'areas_projects')} icon={Map} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'my_projects') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'my_projects')} icon={Building2} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'payouts') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'payouts')} icon={Landmark} onUpdate={loadModules} audience="adminPeers" />
          )}
          {modules.find((m) => m.module_key === 'settings') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'settings')} icon={Settings} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'passwords') && (
            <ModuleCard
              mod={modules.find((m) => m.module_key === 'passwords')}
              icon={Key}
              onUpdate={loadModules}
              includeAdminPeers
              // Rendered right after Settings, and locked to it: the
              // password controls live inside the Settings page, so a
              // role can only get this once it has that.
              dependsOn={{ moduleKey: 'settings', label: 'Settings' }}
            />
          )}
          {modules.find((m) => m.module_key === 'user_management') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'user_management')} icon={Users} onUpdate={loadModules} includeAdminPeers />
          )}
          {modules.find((m) => m.module_key === 'hierarchy_visualizer') && (
            <ModuleCard
              mod={modules.find((m) => m.module_key === 'hierarchy_visualizer')}
              icon={Network}
              onUpdate={loadModules}
              // requireCanViewHierarchy only exempts IT and Operation
              // Manager unconditionally — Company and Governing Council
              // need to be explicitly enabled here like any sales-tier
              // role, so they must appear in the toggle list.
              includeAdminPeers
            />
          )}
          {modules.find((m) => m.module_key === 'bulk_password_reset') && (
            <ModuleCard
              mod={modules.find((m) => m.module_key === 'bulk_password_reset')}
              icon={KeyRound}
              onUpdate={loadModules}
              // The bottom-most sales tier (LIA/LA) has no downline —
              // nobody for a bulk reset to reach — so it's left off the
              // toggle list entirely, same reasoning as User Management
              // not existing for that tier at all.
              excludeBottomTier
              // requireBulkPasswordAccess only exempts IT unconditionally
              // — Company and Governing Council need to be explicitly
              // enabled here too (their downline then resolves to
              // everyone below them in the chain).
              includeAdminPeers
            />
          )}
          {modules.find((m) => m.module_key === 'new_registration') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'new_registration')} icon={ClipboardPlus} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'registration_status') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'registration_status')} icon={ClipboardList} onUpdate={loadModules} />
          )}
          {modules.find((m) => m.module_key === 'wallet') && (
            <ModuleCard mod={modules.find((m) => m.module_key === 'wallet')} icon={Wallet} onUpdate={loadModules} />
          )}
          {(() => {
            const customerEntries = [
              { key: 'customer_payment', icon: IndianRupee, label: 'Payment' },
              { key: 'customer_documents', icon: FileText, label: 'Documents' },
              { key: 'customer_registration_status', icon: ClipboardList, label: 'Registration Status' },
              { key: 'customer_contact', icon: Phone, label: 'Contact' },
              { key: 'customer_settings', icon: Settings, label: 'Settings' },
            ]
              .map(({ key, icon, label }) => {
                const mod = modules.find((m) => m.module_key === key);
                return mod ? { mod, icon, label } : null;
              })
              .filter((e): e is { mod: any; icon: typeof IndianRupee; label: string } => e !== null);

            return customerEntries.length > 0 ? <CustomerModuleGroup entries={customerEntries} onUpdate={loadModules} /> : null;
          })()}
          {modules
            .filter(
              (m) =>
                m.module_key !== 'passwords' &&
                m.module_key !== 'user_management' &&
                m.module_key !== 'hierarchy_visualizer' &&
                m.module_key !== 'bulk_password_reset' &&
                m.module_key !== 'new_registration' &&
                m.module_key !== 'registration_status' &&
                m.module_key !== 'wallet' &&
                !['dashboard', 'areas_projects', 'payouts', 'settings', 'customer_payment', 'customer_documents', 'customer_registration_status', 'customer_contact', 'customer_settings', 'my_projects'].includes(m.module_key)
            )
            .map((mod) => (
              <div key={mod.id} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <Blocks className="w-8 h-8 text-[#a0abbb] mb-3" />
                <h3 className="font-bold text-[#0f1d33] mb-1">{mod.module_name}</h3>
                <p className="text-sm text-[#5a6a82]">Module component not implemented yet.</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
