import AdminLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/layouts/AdminLayout';

export default function GoverningCouncilLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout basePath="/REALESTATE_SOFTWARE/role/GoverningCouncil" roleLabel="Governing Council" showModules={false} showWallet>
      {children}
    </AdminLayout>
  );
}
