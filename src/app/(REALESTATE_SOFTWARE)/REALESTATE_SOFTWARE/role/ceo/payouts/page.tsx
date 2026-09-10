import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import PayoutsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/payouts/PayoutsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function CEOPayoutsPage() {
  await requireRole('ceo');
  return (
    <PageModuleGuard moduleKey="payouts">
      <PayoutsPage />
    </PageModuleGuard>
  );
}
