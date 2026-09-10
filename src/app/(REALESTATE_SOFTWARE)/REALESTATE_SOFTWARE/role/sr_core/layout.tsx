import { createServiceClient } from '@/lib/supabase/server';
import { getSalesRoleLabel } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';
import SalesLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/layouts/SalesLayout';

export default async function SrCoreLayout({ children }: { children: React.ReactNode }) {
  const roleLabel = await getSalesRoleLabel(createServiceClient(), 'sr_core');
  return (
    <SalesLayout basePath="/REALESTATE_SOFTWARE/role/sr_core" roleLabel={roleLabel} showUserManagement>
      {children}
    </SalesLayout>
  );
}
