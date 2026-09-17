/** Match display names to the CMS without inventing a project when no match exists. */
export function normalizeProjectName(name: string): string {
  return name.toLowerCase().replace(/vian\s+vally/g, 'vian valley').replace(/[^a-z0-9]/g, '')
}

export function matchEnquiryProject<T extends { name: string }>(projects: T[], requested?: string): T | undefined {
  if (typeof requested !== 'string' || !requested) return undefined
  return projects.find(project => normalizeProjectName(project.name) === normalizeProjectName(requested))
}

export function enquiryHref(project: string): string {
  return `/?project=${encodeURIComponent(project)}#book-visit`
}

/** Only the overview URL is canonicalised; CMS video routes retain their own slug. */
export function canonicalProjectSlug(slug: string): string {
  const aliases: Record<string, string> = {
    'vian-valley': 'vian-vally',
    's-v-kanaka-maple-homes': 'sv-kanaka-maple-homes',
  }
  return aliases[slug] || slug
}
