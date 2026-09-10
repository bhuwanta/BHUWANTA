import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import DocumentsPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/customer/DocumentsPage';
import PageModuleGuard from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/PageModuleGuard';

export default async function CustomerDocumentsPage() {
  await requireRole('customer');
  return (
    <PageModuleGuard moduleKey="customer_documents">
      <DocumentsPage />
    </PageModuleGuard>
  );
}
