import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import { getSalesRoleOrder } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';
import UserManagementModule from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/user-management/UserManagementModule';
import type { RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';

// The bottommost role in rank order has no one below it to manage — the
// static folders express this by simply not having a users/page.tsx at
// all (role/lia/ is the only static example today, §8h). A dynamic role
// can't omit the file per-request, so the same rule is enforced here at
// request time instead.
export default async function DynamicRoleUsersPage({ params }: { params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  const { userId, role } = await requireRole(roleCode as RealEstateRole);

  const supabaseAdmin = createServiceClient();
  const order = await getSalesRoleOrder(supabaseAdmin);
  const index = order.findIndex((r) => r.role_code === roleCode);
  if (index === -1 || index === order.length - 1) notFound();

  return <UserManagementModule currentUserRole={role} currentUserId={userId} />;
}
