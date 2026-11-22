/**
 * Shape of the layout datasets in /public/data/layouts/*.json.
 *
 * The datasets are generated from the developer's vector layout PDF by
 * scripts/layout3d (see README there): plot outlines and numbers are copied
 * from the PDF vectors, then every venture is placed at its real position
 * (fitted against satellite imagery) and surrounded by real-world context from
 * OpenStreetMap. Coordinates are "world units": x → east, y → south,
 * 1 unit ≈ 1.43 m (`geo.metersPerUnit`).
 */

/** Flat [x0, y0, x1, y1, …] ring. */
export type Ring = number[]

export interface PolygonWithHoles {
  /** Outer ring */
  o: Ring
  /** Hole rings */
  h: Ring[]
}

/** Legend categories exactly as printed on the brochure. */
export type PlotCategory = 'eastNorth' | 'corner' | 'mortgage' | 'road60' | 'road100' | 'standard'

/** [digit, x, y, scale, rotationRadians] – one glyph of a plot number, placed as on the PDF. */
export type GlyphPlacement = [string, number, number, number, number]

export interface LayoutPlot {
  /** `${venture}-${number}` e.g. "VV1-404" */
  id: string
  /** Venture key, e.g. VV1 | VV2 | JC */
  v: string
  /** Plot number as printed */
  n: string
  cat: PlotCategory
  /** Polygon area in world units² (relative size only) */
  a: number
  /** Plot boundary ring */
  p: Ring
  g: GlyphPlacement[]
}

/** 0 = shrub, 1 = palm, 2 = broadleaf shade tree, 3 = ashoka (slender avenue tree) */
export type TreeKind = 0 | 1 | 2 | 3
/** [x, y, kind, size, flags?] – flags bit 0: generated, bit 1: stands in a tree guard on a road verge */
export type TreePlacement = [number, number, TreeKind, number, number?]

export interface TrafficEdge {
  /** start / end node index */
  a: number
  b: number
  /** typical half-width of the road (world units) */
  w: number
  /** centre-line from node a to node b */
  p: Ring
}

/** Drivable road graph (centre-lines) used by the ambient traffic. */
export interface TrafficGraph {
  /** flat [x0, y0, x1, y1, …] */
  nodes: number[]
  edges: TrafficEdge[]
}

export type LandUseKind = 'residential' | 'farm' | 'grass' | 'park' | 'orchard' | 'forest' | 'industrial'

export interface LandUse extends PolygonWithHoles {
  k: LandUseKind
}

/** [x, y, width, depth, height, rotation, colourIndex] */
export type HousePlacement = [number, number, number, number, number, number, number]

export interface ContextLabel {
  /** name */
  n: string
  /** OSM kind: town | village | hamlet | college | … */
  k: string
  x: number
  y: number
}

/** Real-world surroundings (© OpenStreetMap contributors). */
export interface LayoutContext {
  roads: PolygonWithHoles[]
  water: PolygonWithHoles[]
  landuse: LandUse[]
  houses: HousePlacement[]
  places: ContextLabel[]
  amenities: ContextLabel[]
  attribution: string
}

/** World ↔ Web-Mercator: globalPixel = world * pxPerUnit + origin, at `zoom`. */
export interface GeoReference {
  zoom: number
  origin: [number, number]
  pxPerUnit: number
  metersPerUnit: number
}

export interface LayoutDataset {
  version: number
  source: string
  units: 'pdf-points' | 'world'
  page: [number, number]
  /** Outline of each digit glyph ('0'…'9') centred on its control-point mean */
  digits: Record<string, PolygonWithHoles[]>
  plots: LayoutPlot[]
  roads: PolygonWithHoles[]
  water: PolygonWithHoles[]
  greens: PolygonWithHoles[]
  /** Lane-marking quads */
  marks: Ring[]
  trees: TreePlacement[]
  /** World window covered by the context [x0, y0, x1, y1] */
  bounds?: [number, number, number, number]
  geo?: GeoReference
  context?: LayoutContext
  traffic?: TrafficGraph
  /** Clubhouse footprint ring */
  clubhouse?: Ring
}

/** A named point in the regional views. km / min = approx. road distance and drive time from the project. */
export interface RegionPoint {
  n: string
  lat: number
  lon: number
  k: string
  sub?: string
  km?: number
  min?: number
}

/** /public/data/layouts/*-region.json – ring roads and landmarks (see scripts/layout3d/region.py). */
export interface RegionDataset {
  attribution: string
  project: { name: string; lat: number; lon: number }
  orr: { name: string; lines: [number, number][][]; aerialKm: number }
  /** north = mapped proposed alignment; southIndicative = not final, always shown as indicative */
  rrr: { name: string; north: [number, number][][]; southIndicative: [number, number][] }
  cities: RegionPoint[]
  landmarks: RegionPoint[]
}

export type PlotStatus = 'available' | 'booked' | 'sold'

export interface VentureConfig {
  key: string
  name: string
  shortName: string
}

export interface LayoutAnnotation {
  id: string
  label: string
  sublabel?: string
  kind: 'venture' | 'direction' | 'amenity' | 'landmark'
  /** Venture key – the label is anchored above that venture's plots */
  venture?: string
  /** Real-world position (used when `venture` is not set) */
  lat?: number
  lon?: number
}

/** Sales details for a plot that is open for booking (from the site team's plot sheet). */
export interface PlotDetails {
  facing: 'East' | 'West' | 'North' | 'South'
  /** Width of the road the plot faces, e.g. "30 ft" */
  road?: string
  sizeSqYds: number
  /** Frontage × depth as measured on site, e.g. "30' × 55'" */
  dimensions: string
}

export interface LayoutProjectConfig {
  slug: string
  projectName: string
  location: string
  district: string
  datasetUrl: string
  /** Ring roads + nearby landmarks for the regional views */
  regionUrl?: string
  pdfLayoutUrl: string
  googleMapsUrl: string
  whatsappNumber: string
  ventures: VentureConfig[]
  /** Plot ids per status. Plots not listed fall back to `defaultStatus`. */
  inventory: {
    available: string[]
    booked: string[]
    defaultStatus: PlotStatus
  }
  /** Details shown for available plots, keyed by plot id */
  plotDetails?: Record<string, PlotDetails>
  annotations: LayoutAnnotation[]
  /** Filled from Sanity on the server */
  brochureUrls?: string[]
  highlights?: string[]
  images?: string[]
  approvalBadge?: string
}

export const CATEGORY_LABELS: Record<PlotCategory, string> = {
  eastNorth: 'East & North facing',
  corner: 'Corner plot',
  mortgage: 'Mortgage plot',
  road60: '60 ft road facing',
  road100: '100 ft road facing',
  standard: 'Standard plot',
}

/** Brochure legend colours (sampled from the PDF fills). */
export const CATEGORY_COLORS: Record<PlotCategory, string> = {
  eastNorth: '#e6bf66',
  corner: '#9c6e0d',
  mortgage: '#baadd6',
  road60: '#eb9e1c',
  road100: '#fcd645',
  standard: '#fbfaf6',
}

export const STATUS_COLORS: Record<PlotStatus, string> = {
  available: '#10b981',
  booked: '#f59e0b',
  sold: '#dc2626',
}

export const STATUS_LABELS: Record<PlotStatus, string> = {
  available: 'Available',
  booked: 'Booked',
  sold: 'Sold',
}

export function resolvePlotStatus(id: string, inventory: LayoutProjectConfig['inventory']): PlotStatus {
  if (inventory.available.includes(id)) return 'available'
  if (inventory.booked.includes(id)) return 'booked'
  return inventory.defaultStatus
}

/** World units → latitude / longitude (Web-Mercator inverse). */
export function worldToLatLon(geo: GeoReference, x: number, y: number) {
  const n = 256 * 2 ** geo.zoom
  const gx = x * geo.pxPerUnit + geo.origin[0]
  const gy = y * geo.pxPerUnit + geo.origin[1]
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * gy) / n))) * 180) / Math.PI
  const lon = (gx / n) * 360 - 180
  return { lat, lon }
}

/** Latitude / longitude → world units. */
export function latLonToWorld(geo: GeoReference, lat: number, lon: number) {
  const n = 256 * 2 ** geo.zoom
  const r = (lat * Math.PI) / 180
  const gx = ((lon + 180) / 360) * n
  const gy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  return { x: (gx - geo.origin[0]) / geo.pxPerUnit, y: (gy - geo.origin[1]) / geo.pxPerUnit }
}

export function googleMapsLink(lat: number, lon: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`
}
