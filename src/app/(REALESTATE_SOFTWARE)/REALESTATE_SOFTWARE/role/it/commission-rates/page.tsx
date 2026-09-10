import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import CommissionRatesPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/commission-rates/CommissionRatesPage';

export default async function ITCommissionRatesPage() {
  await requireRole('it');
  return <CommissionRatesPage />;
}
