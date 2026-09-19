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

// CMS project names and locations are typed freely: mostly upper case, with
// stray spaces and the odd misspelling. These tidy them for search-result
// titles and descriptions without touching what the CMS stores.
function tidySpaces(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function titleCaseIfShouting(value: string): string {
  if (value !== value.toUpperCase()) return value
  // Short all-caps words are initials or acronyms (TJR, RPL, S.V.): keep them.
  return value
    .split(' ')
    .map((word) => (word.replace(/[^A-Za-z]/g, '').length <= 3 ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(' ')
}

export function displayProjectName(name?: string | null): string {
  return titleCaseIfShouting(tidySpaces(name))
}

export function displayProjectPlace(location?: string | null): string {
  const place = titleCaseIfShouting(tidySpaces(location)).replace(/\bbanglore\b/gi, 'Bangalore')
  return place.charAt(0).toUpperCase() + place.slice(1)
}

/** "<name>, <suffix> | Bhuwanta", dropping the suffix when that runs past 60 characters. */
export function projectPageTitle(name: string, suffix?: string | null): string {
  const withSuffix = suffix ? `${name}, ${suffix} | Bhuwanta` : ''
  return withSuffix && withSuffix.length <= 60 ? withSuffix : `${name} | Bhuwanta`
}
