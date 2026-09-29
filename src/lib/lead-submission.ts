/** A resolved HTTP request is not success until the CRM returns its saved ID. */
export async function submitContactLead(payload: Record<string, unknown>): Promise<{ leadId: string }> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok || typeof data?.leadId !== 'string' || !data.leadId.trim()) {
    throw new Error('We could not confirm your enquiry was saved. Please retry.')
  }
  return { leadId: data.leadId }
}
