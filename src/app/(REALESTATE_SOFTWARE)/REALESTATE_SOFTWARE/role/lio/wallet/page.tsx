import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import WalletPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/wallet/GuardedWalletPage';

export default async function LIOWalletPage() {
  await requireRole('lio');
  return <WalletPage />;
}
