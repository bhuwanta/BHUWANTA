import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import SelfSettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/settings/SelfSettingsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function GMSettingsPage() {
  await requireRole('gm');
  return (
    <PageModuleGuard moduleKey="settings">
      <SelfSettingsPage />
    </PageModuleGuard>
  );
}
