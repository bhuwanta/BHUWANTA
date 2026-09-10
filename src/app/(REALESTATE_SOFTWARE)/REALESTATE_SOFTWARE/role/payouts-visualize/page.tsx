import { redirect } from 'next/navigation';
import { requireAnyRole, verifyCaller } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import { checkHierarchyModuleStatusAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/hierarchy/actions';
import VisualizePayoutClient from './VisualizePayoutClient';

export default async function VisualizePayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string; scope?: string }>;
}) {
  const { registrationId, scope } = await searchParams;

  // Two audiences, two very different views of the same sale:
  //
  //  - default (IT / Operation Manager): the whole chain from the
  //    Company down, with everyone's cut — the oversight view.
  //  - scope=mine (a payee opening it from their own Wallet): rooted at
  //    themselves, running only DOWNWARD, showing their own commission
  //    and nobody else's. Gated on the Visualize Hierarchy module being
  //    switched on for their role; the data action itself re-checks that
  //    they were actually paid on this sale.
  if (scope === 'mine') {
    const caller = await verifyCaller();
    if (!caller) redirect('/REALESTATE_SOFTWARE/login');
    if (caller.role !== 'it' && caller.role !== 'operation_manager') {
      const moduleStatus = await checkHierarchyModuleStatusAction(caller.role);
      if (!moduleStatus.isEnabled) redirect('/REALESTATE_SOFTWARE/login');
    }
  } else {
    await requireAnyRole(['it', 'operation_manager']);
  }

  return <VisualizePayoutClient registrationId={registrationId || null} scope={scope === 'mine' ? 'mine' : 'all'} />;
}
