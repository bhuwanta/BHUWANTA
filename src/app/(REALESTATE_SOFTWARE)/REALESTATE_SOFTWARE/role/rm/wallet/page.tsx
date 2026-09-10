import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/auth';
import WalletPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/wallet/GuardedWalletPage';

export default async function RMWalletPage() {
  await requireRole('rm');
  return <WalletPage />;
}
