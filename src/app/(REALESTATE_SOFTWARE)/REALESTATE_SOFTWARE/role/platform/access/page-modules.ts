/** Every page IT can switch on/off per role from the Modules page,
 * keyed by module_key so the string only appears once.
 *
 * Deliberately NOT in nav-modules.ts: that file is `'use server'`, and
 * a server-actions file may only export async functions — exporting a
 * plain object from it fails at build time. */
export const PAGE_MODULES = {
  dashboard: 'dashboard',
  areasProjects: 'areas_projects',
  payouts: 'payouts',
  settings: 'settings',
  myProjects: 'my_projects',
  customerPayment: 'customer_payment',
  customerDocuments: 'customer_documents',
  customerRegistrationStatus: 'customer_registration_status',
  customerContact: 'customer_contact',
  customerSettings: 'customer_settings',
} as const
