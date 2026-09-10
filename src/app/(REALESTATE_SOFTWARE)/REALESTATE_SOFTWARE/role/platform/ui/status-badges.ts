// Shared status → badge/label maps for registration_status, reused
// across every Customer Dashboard page that renders a registration's
// status (Dashboard, Payment, Registration Status).

export const STATUS_BADGE: Record<string, string> = {
  pending_registration: 'bg-amber-50 text-amber-600',
  registration_done: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-600',
}

export const STATUS_LABEL: Record<string, string> = {
  pending_registration: 'Pending',
  registration_done: 'Registration Done',
  cancelled: 'Cancelled',
}
