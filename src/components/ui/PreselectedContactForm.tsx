'use client'

import { useSearchParams } from 'next/navigation'
import { ContactForm } from '@/components/ui/ContactForm'

type Props = Omit<React.ComponentProps<typeof ContactForm>, 'initialProject'>

// Reads ?project= in the browser so the page around the booking form can be
// statically cached. Reading searchParams on the server made the whole home
// page render per request just to preselect one dropdown value.
export function PreselectedContactForm(props: Props) {
  const project = useSearchParams().get('project') || undefined
  return <ContactForm key={project || 'general'} {...props} initialProject={project} />
}
