import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import SelfSettingsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/settings/SelfSettingsPage';

export default async function OperationManagerSettingsPage() {
  await requireRole('operation_manager');
  return <SelfSettingsPage />;
}
