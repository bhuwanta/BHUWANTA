import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import SettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/admin-settings/SettingsPage';

export default async function CEOSettingsPage() {
  await requireRole('ceo');
  return <SettingsPage />;
}
