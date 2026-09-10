import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import PaymentPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/payment/PaymentPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function CustomerPaymentPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_payment">
      <PaymentPage />
    </PageModuleGuard>
  );
}
