import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import OperationManagerDashboard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/operation-manager/OperationManagerDashboard';

export default async function OperationManagerDashboardPage() {
  await requireRole('operation_manager');
  return <OperationManagerDashboard />;
}
