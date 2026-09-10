import { createServiceClient } from '@/lib/supabase/server';
import { getSalesRoleLabel } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions';
import SalesLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/layouts/SalesLayout';

export default async function AGMLayout({ children }: { children: React.ReactNode }) {
  const roleLabel = await getSalesRoleLabel(createServiceClient(), 'agm');
  return (
    <SalesLayout basePath="/REALESTATE_SOFTWARE/role/agm" roleLabel={roleLabel} showUserManagement>
      {children}
    </SalesLayout>
  );
}
