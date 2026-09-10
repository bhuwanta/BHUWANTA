import { notFound } from 'next/navigation';
import NewRegistrationPage from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/new-registration/NewRegistrationPage';
import { requireCanCreateRegistration } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/registrations-access';

/** New Registration behind its module gate — same reasoning as
 * GuardedRegistrationsPage: the per-role literal routes outrank
 * role/[roleCode], so the guard has to live somewhere every one of them
 * renders. Without it the form would draw for a role whose module is
 * off and only fail at submit time. */
export default async function GuardedNewRegistrationPage() {
  const allowed = await requireCanCreateRegistration();
  if (!allowed.ok) notFound();
  return <NewRegistrationPage />;
}
