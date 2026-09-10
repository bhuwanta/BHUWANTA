import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import SettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/settings/SettingsPage';

export default async function ITSettingsPage() {
  await requireRole('it');
  return <SettingsPage />;
}
