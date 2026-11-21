import { Project3DData } from './types'
import { VIAN_VALLEY_3D_PROJECT } from './vianValley'

export * from './types'
export * from './vianValley'

const PROJECTS_3D_MAP: Record<string, Project3DData> = {
  'vian-vally': VIAN_VALLEY_3D_PROJECT,
  'vian-valley': VIAN_VALLEY_3D_PROJECT,
}

export function getProject3DData(slug: string): Project3DData | null {
  const normalized = slug.toLowerCase().trim()
  return PROJECTS_3D_MAP[normalized] || null
}
