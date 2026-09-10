import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import CommissionRatesPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/CommissionRatesPage';

export default async function CEOCommissionRatesPage() {
  await requireRole('ceo');
  return <CommissionRatesPage />;
}
