import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import SelfSettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/settings/SelfSettingsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/PageModuleGuard';

export default async function CustomerSettingsPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_settings">
      <SelfSettingsPage />
    </PageModuleGuard>
  );
}
