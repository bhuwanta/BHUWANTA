import type { LayoutProjectConfig } from '@/lib/layout3d/types'

/**
 * Vian Valley (Shabad) – 3D layout configuration.
 *
 * Plot geometry and numbers come from /public/data/layouts/vian-valley-shabad.json,
 * generated from public/documents/vian_valley_shabad_layout.pdf by scripts/layout3d.
 * Only business data (inventory, labels) lives here.
 *
 * Plot ids are `${venture}-${plotNumber}`: VV1 = Vian Valley-1 (1–1342),
 * VV2 = Vian Valley-2 (1–240), JC = Vian Jubilee Central (1–107).
 */
export const VIAN_VALLEY_LAYOUT: LayoutProjectConfig = {
  slug: 'vian-vally',
  projectName: 'Vian Valley',
  location: 'Shabad, South-West Hyderabad',
  district: 'Ranga Reddy',
  datasetUrl: '/data/layouts/vian-valley-shabad.json',
  regionUrl: '/data/layouts/vian-valley-region.json',
  pdfLayoutUrl: '/documents/vian_valley_shabad_layout.pdf',
  googleMapsUrl: 'https://maps.app.goo.gl/PxP6owF57ouPdg966',
  whatsappNumber: '919666504405',
  ventures: [
    { key: 'VV1', name: 'Vian Valley-1', shortName: 'Valley 1' },
    { key: 'VV2', name: 'Vian Valley-2', shortName: 'Valley 2' },
    { key: 'JC', name: 'Vian Jubilee Central', shortName: 'Jubilee' },
  ],
  inventory: {
    // Plots currently open for sale. Everything not listed is treated as sold.
    available: ['VV1-496', 'VV1-698', 'VV1-1245', 'VV1-1246', 'VV1-1247', 'VV1-1253', 'VV1-1284', 'VV1-1301', 'VV1-1309'],
    booked: [],
    defaultStatus: 'sold',
  },
  // From the site team's plot sheet (Nov 2026). Neighbouring plot numbers on the sheet were
  // cross-checked against the layout. Sizes in square yards; dimensions in feet.
  plotDetails: {
    'VV1-496': { facing: 'East', road: '30 ft', sizeSqYds: 183.33, dimensions: "30' × 55'" },
    'VV1-698': { facing: 'East', road: '30 ft', sizeSqYds: 207.83, dimensions: "30' × 62'" },
    'VV1-1245': { facing: 'West', road: '30 ft', sizeSqYds: 200, dimensions: "30' × 60'" },
    'VV1-1246': { facing: 'West', sizeSqYds: 200, dimensions: "30' × 60'" },
    'VV1-1247': { facing: 'West', road: '60 ft', sizeSqYds: 797.12, dimensions: "60' × 120'" },
    'VV1-1253': { facing: 'East', road: '30 ft', sizeSqYds: 200, dimensions: "30' × 60'" },
    'VV1-1284': { facing: 'East', road: '30 ft', sizeSqYds: 200, dimensions: "30' × 60'" },
    'VV1-1301': { facing: 'West', road: '30 ft', sizeSqYds: 200, dimensions: "30' × 60'" },
    'VV1-1309': { facing: 'West', road: '30 ft', sizeSqYds: 200, dimensions: "30' × 60'" },
  },
  // Ventures are anchored over their plots; everything else at its real-world position.
  // Village names and PRRM Engineering College come from OpenStreetMap via the dataset.
  annotations: [
    { id: 'vv1', label: 'Vian Valley-1', sublabel: '1,341 plots', kind: 'venture', venture: 'VV1' },
    { id: 'vv2', label: 'Vian Valley-2', sublabel: '240 plots', kind: 'venture', venture: 'VV2' },
    { id: 'jc', label: 'Vian Jubilee Central', sublabel: '107 plots', kind: 'venture', venture: 'JC' },
    { id: 'club', label: 'Resort Club', sublabel: '30,000 sq ft', kind: 'amenity', lat: 17.16767, lon: 78.145001 },
    { id: 'expansion', label: 'Proposed Expansion', kind: 'amenity', lat: 17.168123, lon: 78.14666 },
    { id: 'chevella', label: 'Towards Chevella', kind: 'direction', lat: 17.179518, lon: 78.135222 },
    { id: 'sez', label: 'Towards Chandanvelly SEZ', kind: 'direction', lat: 17.179518, lon: 78.151232 },
    { id: 'shadnagar', label: 'Towards Shadnagar', kind: 'direction', lat: 17.145578, lon: 78.134869 },
  ],
}

const LAYOUTS: Record<string, LayoutProjectConfig> = {
  'vian-vally': VIAN_VALLEY_LAYOUT,
  'vian-valley': VIAN_VALLEY_LAYOUT,
  'shabad-open-plots': VIAN_VALLEY_LAYOUT,
}

export function getLayoutProject(slug: string): LayoutProjectConfig | null {
  return LAYOUTS[slug.toLowerCase().trim()] ?? null
}
