import AdminLayout from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/layouts/AdminLayout';

export default function ITLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout basePath="/REALESTATE_SOFTWARE/role/it" roleLabel="IT Admin" showPayoutRules>
      {children}
    </AdminLayout>
  );
}
