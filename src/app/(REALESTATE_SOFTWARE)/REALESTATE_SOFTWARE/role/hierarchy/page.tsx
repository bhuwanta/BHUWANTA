import { redirect } from 'next/navigation';
import { verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import { checkHierarchyModuleStatusAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/hierarchy/actions';
import HierarchyPageClient from './HierarchyPageClient';

export default async function HierarchyPage() {
  // Not requireRole/requireAnyRole: this page's audience isn't a fixed
  // role list any more. IT and Operation Manager always have it; every
  // other role is opt-in through the "Visualize Hierarchy" module
  // (S_modules, IT-configurable on the Modules page), so the allowed set
  // is only knowable at request time. The same rule is enforced again
  // inside getHierarchyChildrenAction — this guard just avoids rendering
  // an empty shell to someone who'd be refused on every data call.
  const caller = await verifyCaller();
  if (!caller) redirect('/REALESTATE_SOFTWARE/login');

  if (caller.role !== 'it' && caller.role !== 'operation_manager') {
    const moduleStatus = await checkHierarchyModuleStatusAction(caller.role);
    if (!moduleStatus.isEnabled) redirect('/REALESTATE_SOFTWARE/login');
  }

  return <HierarchyPageClient />;
}
