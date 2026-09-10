import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getSalesRoleOrder } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/permissions';
import SalesLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/layouts/SalesLayout';

// Serves any sales-tier role NOT covered by a static role/<name>/ folder
// — i.e. a role created via the Commission Rates page (migration 008 /
// S_role_definitions). Next.js always prefers an exact static route
// match over a dynamic one at the same level, so this never intercepts
// /role/director, /role/rm, etc. — only a brand-new role's URL falls
// through to here. Additive only; the 8 built-in role folders are
// untouched.
export default async function DynamicRoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ roleCode: string }> }) {
  const { roleCode } = await params;
  const supabaseAdmin = createServiceClient();
  const order = await getSalesRoleOrder(supabaseAdmin);
  const index = order.findIndex((r) => r.role_code === roleCode);
  if (index === -1) notFound();

  // Whether anyone can be created below this role — same rule as LIA's
  // static folder simply omitting users/page.tsx (§8h): if this role is
  // the last in rank order, it has no downline to manage.
  const showUserManagement = index < order.length - 1;

  return (
    <SalesLayout basePath={`/REALESTATE_SOFTWARE/role/${roleCode}`} roleLabel={order[index].label} showUserManagement={showUserManagement}>
      {children}
    </SalesLayout>
  );
}
