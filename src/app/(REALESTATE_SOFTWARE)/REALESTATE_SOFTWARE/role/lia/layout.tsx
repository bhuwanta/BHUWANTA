import { createServiceClient } from '@/lib/supabase/server';
import { getSalesRoleLabel } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';
import SalesLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/layouts/SalesLayout';

export default async function LIALayout({ children }: { children: React.ReactNode }) {
  const roleLabel = await getSalesRoleLabel(createServiceClient(), 'lia');
  return (
    <SalesLayout basePath="/REALESTATE_SOFTWARE/role/lia" roleLabel={roleLabel} showUserManagement={false}>
      {children}
    </SalesLayout>
  );
}
