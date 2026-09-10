import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import SelfSettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/settings/SelfSettingsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function LIOSettingsPage() {
  await requireRole('lio');
  return (
    <PageModuleGuard moduleKey="settings">
      <SelfSettingsPage />
    </PageModuleGuard>
  );
}
