export type PlotStatus = 'available' | 'booked' | 'sold' | 'mortgage'
export type PlotFacing = 'East' | 'North' | 'West' | 'South' | 'Corner'
export type PlotSector = 'Phase 1' | 'Phase 2' | 'Jubilee Central'

export interface Plot3D {
  id: string
  plotNumber: string
  sector: PlotSector
  status: PlotStatus
  facing: PlotFacing
  areaSqYds: number
  areaSqFt: number
  dimensions: string
  roadWidth: string
  pricePerSqYd: number
  totalPrice: number
  isCorner: boolean
  isMortgage: boolean
  // 3D positioning
  position: [number, number, number] // [x, y, z]
  size: [number, number, number]     // [width, height, depth]
  rotationY?: number
}

export interface Landmark3D {
  id: string
  name: string
  subtitle: string
  distance: string
  travelTime: string
  direction: string
  position: [number, number, number]
  type: 'sez' | 'airport' | 'highway' | 'education' | 'lake' | 'civic'
}

export interface SectorView3D {
  id: string
  name: string
  cameraPosition: [number, number, number]
  target: [number, number, number]
}

export interface Project3DData {
  projectId: string
  projectName: string
  slug: string
  location: string
  district: string
  totalPlots: number
  availablePlots: number
  bookedPlots: number
  soldPlots: number
  mortgagePlots: number
  ratePerSqYd: number
  pdfLayoutUrl: string
  sectors: SectorView3D[]
  landmarks: Landmark3D[]
  plots: Plot3D[]
}
