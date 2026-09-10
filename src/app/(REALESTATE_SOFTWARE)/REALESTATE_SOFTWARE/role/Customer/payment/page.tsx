import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import PaymentPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/customer/PaymentPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/PageModuleGuard';

export default async function CustomerPaymentPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_payment">
      <PaymentPage />
    </PageModuleGuard>
  );
}
