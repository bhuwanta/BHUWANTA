import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import PayoutRulesPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/payout-rules/PayoutRulesPage';

export default async function ITPayoutRulesPage() {
  await requireRole('it');
  return <PayoutRulesPage />;
}
