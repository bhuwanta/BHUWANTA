import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import SettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/settings/SettingsPage';

export default async function CEOSettingsPage() {
  await requireRole('ceo');
  return <SettingsPage />;
}
