import { requireRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/auth/auth';
import WalletPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/wallet/WalletPage';

export default async function GoverningCouncilWalletPage() {
  await requireRole('governing_council');
  return <WalletPage />;
}
