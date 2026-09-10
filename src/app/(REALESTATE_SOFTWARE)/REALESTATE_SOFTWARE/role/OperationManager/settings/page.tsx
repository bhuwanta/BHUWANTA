import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import SelfSettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/settings/SelfSettingsPage';

export default async function OperationManagerSettingsPage() {
  await requireRole('operation_manager');
  return <SelfSettingsPage />;
}
