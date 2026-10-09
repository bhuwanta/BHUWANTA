import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Unauthorized | Bhuwanta CRM',
}

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-red-50 p-4 rounded-full mb-6">
        <ShieldAlert className="w-12 h-12 text-red-600" />
      </div>
      <h1 className="text-3xl font-bold text-[#0f1d33] mb-3">Access Denied</h1>
      <p className="text-[#5a6a82] max-w-md mb-8">
        You do not have permission to view this page. If you believe this is a mistake, please contact your administrator.
      </p>
      <Link 
        href="/crm" 
        className="px-6 py-2.5 bg-[#0f1d33] text-white rounded-lg font-medium hover:bg-[#1a2b47] transition-colors shadow-sm"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
