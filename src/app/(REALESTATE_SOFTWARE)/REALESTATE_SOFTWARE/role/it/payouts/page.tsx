import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import PayoutsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/payouts/PayoutsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/PageModuleGuard';

export default async function ITPayoutsPage() {
  await requireRole('it');
  return (
    <PageModuleGuard moduleKey="payouts">
      <PayoutsPage currentUserRole="it" />
    </PageModuleGuard>
  );
}
