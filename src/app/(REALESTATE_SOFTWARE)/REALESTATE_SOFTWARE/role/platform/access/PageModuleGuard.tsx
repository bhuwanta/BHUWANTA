import { notFound, redirect } from 'next/navigation';
import { requirePageModule, getMyNavModulesAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/nav-modules';
import { PAGE_MODULES } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/page-modules';

/** Wraps a page in its module gate. Every role's route file renders
 * this rather than the page component directly — the per-role literal
 * routes (role/lia/…, role/director/…) outrank role/[roleCode]/…, so a
 * guard placed only on the dynamic fallback would never run for them.
 *
 * `redirectBase` exists for the Dashboard alone: login lands on a
 * role's base path, so 404-ing a disabled Dashboard would lock that
 * role out of the app entirely. Instead it bounces to the first page
 * that role can still open. */
export default async function PageModuleGuard({
  moduleKey,
  redirectBase,
  children,
}: {
  moduleKey: string;
  redirectBase?: string;
  children: React.ReactNode;
}) {
  const allowed = await requirePageModule(moduleKey);
  if (allowed.ok) return <>{children}</>;

  if (redirectBase) {
    const flags = await getMyNavModulesAction();
    // Only pages this helper knows the state of — bouncing to one that
    // is also disabled would just land on another 404.
    if (flags[PAGE_MODULES.areasProjects]) redirect(`${redirectBase}/areas-projects`);
    if (flags[PAGE_MODULES.myProjects]) redirect(`${redirectBase}/projects`);
    if (flags[PAGE_MODULES.settings]) redirect(`${redirectBase}/settings`);
    // Every page this role could land on is switched off. Say so
    // plainly instead of 404-ing or looping — the account is fine, its
    // access just hasn't been configured.
    return (
      <div className="p-6 h-full flex items-center justify-center bg-[#f7f8fa]">
        <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8 max-w-md text-center">
          <h1 className="text-lg font-bold text-[#0f1d33] mb-2">No pages enabled</h1>
          <p className="text-sm text-[#5a6a82]">Your role currently has no pages switched on. Ask IT to enable the modules you need from the Modules page.</p>
        </div>
      </div>
    );
  }

  notFound();
}
