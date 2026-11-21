import { Project3DData, Plot3D, Landmark3D, SectorView3D } from './types'

// Build realistic plots for Phase 1 (The main mega township)
function generatePhase1Plots(): Plot3D[] {
  const plots: Plot3D[] = []
  const baseRate = 12500 // ₹12,500 per sq. yard
  let plotNum = 1

  // Row configuration: [rowZ, count, startX, plotW, plotD, facingTop, facingBottom]
  const rows = [
    // Block A - East edge near Resort Club (Premium 200 - 300 Sq. Yds)
    { startZ: 20, count: 12, startX: 10, w: 4.8, d: 7.2, facing: 'East' as const, sqYds: 240, dims: "36' × 60'" },
    { startZ: 11, count: 12, startX: 10, w: 4.8, d: 7.2, facing: 'North' as const, sqYds: 240, dims: "36' × 60'" },
    // Block B - Central Avenue (Standard 167 - 200 Sq. Yds)
    { startZ: -2, count: 14, startX: 8, w: 4.0, d: 6.5, facing: 'East' as const, sqYds: 167, dims: "30' × 50'" },
    { startZ: -10, count: 14, startX: 8, w: 4.0, d: 6.5, facing: 'West' as const, sqYds: 167, dims: "30' × 50'" },
    // Block C - North Avenue (200 Sq. Yds)
    { startZ: -22, count: 12, startX: 10, w: 4.2, d: 7.0, facing: 'North' as const, sqYds: 200, dims: "30' × 60'" },
    { startZ: -31, count: 12, startX: 10, w: 4.2, d: 7.0, facing: 'South' as const, sqYds: 200, dims: "30' × 60'" },
    // Block D - Luxury Corner & Park Facing (300 - 450 Sq. Yds)
    { startZ: -42, count: 8, startX: 12, w: 6.0, d: 8.0, facing: 'Corner' as const, sqYds: 350, dims: "42' × 75'" },
  ]

  // Status distribution seeds for consistent realistic display
  // 0-3: available, 4-5: booked, 6-8: sold, 9: mortgage
  const statusSeed = [
    'available', 'sold', 'available', 'booked', 'sold',
    'available', 'available', 'sold', 'booked', 'sold',
    'available', 'sold', 'mortgage', 'available', 'booked',
    'sold', 'available', 'sold', 'available', 'sold',
    'booked', 'available', 'sold', 'sold', 'available',
    'mortgage', 'available', 'booked', 'sold', 'available'
  ] as const

  let seedIdx = 0

  rows.forEach((row, rIdx) => {
    for (let c = 0; c < row.count; c++) {
      const isCorner = c === 0 || c === row.count - 1 || rIdx === rows.length - 1
      const isMortgage = !isCorner && (c === 5 || c === 11) && rIdx % 2 === 0
      const seedStatus = isMortgage ? 'mortgage' : (isCorner ? (c % 2 === 0 ? 'available' : 'booked') : statusSeed[seedIdx % statusSeed.length])
      seedIdx++

      const x = row.startX + c * (row.w + 0.6)
      const z = row.startZ
      const sqYds = isCorner ? Math.round(row.sqYds * 1.3) : row.sqYds
      const roadWidth = isCorner ? '60 Feet Main Road' : (rIdx < 2 ? '60 Feet Road' : '40 Feet Road')

      plots.push({
        id: `vv1-${plotNum}`,
        plotNumber: `${plotNum}`,
        sector: 'Phase 1',
        status: seedStatus,
        facing: isCorner ? 'Corner' : row.facing,
        areaSqYds: sqYds,
        areaSqFt: sqYds * 9,
        dimensions: isCorner ? `45' × 70'` : row.dims,
        roadWidth,
        pricePerSqYd: isCorner ? baseRate + 1500 : baseRate,
        totalPrice: sqYds * (isCorner ? baseRate + 1500 : baseRate),
        isCorner,
        isMortgage,
        position: [x, 0.25, z],
        size: [row.w, 0.5, row.d],
      })

      plotNum++
    }
  })

  return plots
}

// Build plots for Phase 2 (Central Chandanvelly SEZ corridor)
function generatePhase2Plots(): Plot3D[] {
  const plots: Plot3D[] = []
  const baseRate = 13500 // Slightly higher near 300ft Road & SEZ
  let plotNum = 201

  const rows = [
    { startZ: 15, count: 10, startX: -45, w: 4.2, d: 6.8, facing: 'North' as const, sqYds: 200, dims: "30' × 60'" },
    { startZ: 6, count: 10, startX: -45, w: 4.2, d: 6.8, facing: 'South' as const, sqYds: 200, dims: "30' × 60'" },
    { startZ: -8, count: 11, startX: -48, w: 4.0, d: 6.5, facing: 'East' as const, sqYds: 180, dims: "30' × 54'" },
    { startZ: -16, count: 11, startX: -48, w: 4.0, d: 6.5, facing: 'West' as const, sqYds: 180, dims: "30' × 54'" },
  ]

  const statusSeed = [
    'sold', 'available', 'sold', 'sold', 'booked',
    'available', 'sold', 'available', 'mortgage', 'sold',
    'booked', 'available', 'sold', 'available', 'sold'
  ] as const

  let seedIdx = 0

  rows.forEach((row, rIdx) => {
    for (let c = 0; c < row.count; c++) {
      const isCorner = c === 0 || c === row.count - 1
      const isMortgage = !isCorner && c === 4 && rIdx === 1
      const seedStatus = isMortgage ? 'mortgage' : (isCorner ? 'sold' : statusSeed[seedIdx % statusSeed.length])
      seedIdx++

      const x = row.startX + c * (row.w + 0.6)
      const z = row.startZ
      const sqYds = isCorner ? Math.round(row.sqYds * 1.25) : row.sqYds

      plots.push({
        id: `vv2-${plotNum}`,
        plotNumber: `${plotNum}`,
        sector: 'Phase 2',
        status: seedStatus,
        facing: isCorner ? 'Corner' : row.facing,
        areaSqYds: sqYds,
        areaSqFt: sqYds * 9,
        dimensions: isCorner ? `40' × 65'` : row.dims,
        roadWidth: '40 Feet Sector Road',
        pricePerSqYd: baseRate,
        totalPrice: sqYds * baseRate,
        isCorner,
        isMortgage,
        position: [x, 0.25, z],
        size: [row.w, 0.5, row.d],
      })

      plotNum++
    }
  })

  return plots
}

// Build plots for Vian Jubilee Central (South-West lakefront & PRRM College side)
function generateJubileeCentralPlots(): Plot3D[] {
  const plots: Plot3D[] = []
  const baseRate = 12000
  let plotNum = 301

  const rows = [
    { startZ: 60, count: 8, startX: -60, w: 4.5, d: 7.0, facing: 'East' as const, sqYds: 220, dims: "33' × 60'" },
    { startZ: 50, count: 8, startX: -60, w: 4.5, d: 7.0, facing: 'West' as const, sqYds: 220, dims: "33' × 60'" },
    { startZ: 38, count: 9, startX: -62, w: 4.2, d: 6.8, facing: 'North' as const, sqYds: 200, dims: "30' × 60'" },
    { startZ: 28, count: 9, startX: -62, w: 4.2, d: 6.8, facing: 'South' as const, sqYds: 200, dims: "30' × 60'" },
  ]

  const statusSeed = [
    'available', 'booked', 'available', 'sold', 'available',
    'sold', 'available', 'sold', 'mortgage', 'available'
  ] as const

  let seedIdx = 0

  rows.forEach((row, rIdx) => {
    for (let c = 0; c < row.count; c++) {
      const isCorner = c === 0 || c === row.count - 1
      const isMortgage = !isCorner && c === 3 && rIdx === 0
      const seedStatus = isMortgage ? 'mortgage' : (isCorner ? (c === 0 ? 'available' : 'booked') : statusSeed[seedIdx % statusSeed.length])
      seedIdx++

      const x = row.startX + c * (row.w + 0.6)
      const z = row.startZ
      const sqYds = isCorner ? 267 : row.sqYds

      plots.push({
        id: `vjc-${plotNum}`,
        plotNumber: `${plotNum}`,
        sector: 'Jubilee Central',
        status: seedStatus,
        facing: isCorner ? 'Corner' : row.facing,
        areaSqYds: sqYds,
        areaSqFt: sqYds * 9,
        dimensions: isCorner ? `40' × 60'` : row.dims,
        roadWidth: isCorner ? '60 Feet Road' : '33 Feet Road',
        pricePerSqYd: baseRate,
        totalPrice: sqYds * baseRate,
        isCorner,
        isMortgage,
        position: [x, 0.25, z],
        size: [row.w, 0.5, row.d],
      })

      plotNum++
    }
  })

  return plots
}

const allPlots: Plot3D[] = [
  ...generatePhase1Plots(),
  ...generatePhase2Plots(),
  ...generateJubileeCentralPlots(),
]

const availableCount = allPlots.filter((p) => p.status === 'available').length
const bookedCount = allPlots.filter((p) => p.status === 'booked').length
const soldCount = allPlots.filter((p) => p.status === 'sold').length
const mortgageCount = allPlots.filter((p) => p.status === 'mortgage').length

export const VIAN_VALLEY_LANDMARKS: Landmark3D[] = [
  {
    id: 'chandanvelly-sez',
    name: 'Chandanvelly SEZ',
    subtitle: 'Amazon AWS Data Center & Welspun Flooring',
    distance: '6.5 km',
    travelTime: '10 Mins',
    direction: 'North-East',
    position: [-5, 4, -80],
    type: 'sez',
  },
  {
    id: 'master-plan-road',
    name: '300 Ft Master Plan Road',
    subtitle: 'Connecting Regional Ring Road (RRR) Corridor',
    distance: 'Adjacent',
    travelTime: 'Direct Access',
    direction: 'Main Corridor',
    position: [-10, 3, 0],
    type: 'highway',
  },
  {
    id: 'shabad-municipality',
    name: 'Shabad Municipality',
    subtitle: 'Local Administrative & Commercial Hub',
    distance: '2.0 km',
    travelTime: '3 Mins',
    direction: 'West',
    position: [-85, 3, 40],
    type: 'civic',
  },
  {
    id: 'prrm-college',
    name: 'PRRM Engineering College',
    subtitle: 'Prominent Educational Institution',
    distance: '1.2 km',
    travelTime: '2 Mins',
    direction: 'South-West',
    position: [-75, 3, 75],
    type: 'education',
  },
  {
    id: 'mini-tank-bund',
    name: 'Mini Tank Bund',
    subtitle: 'Scenic Waterbody & Eco-Park Tourism Spot',
    distance: 'Adjacent',
    travelTime: 'Walking Distance',
    direction: 'South',
    position: [-90, 2, 90],
    type: 'lake',
  },
  {
    id: 'airport-shamshabad',
    name: 'RGIA Airport (Shamshabad)',
    subtitle: 'Via Chevella / ORR Expressway',
    distance: '32 km',
    travelTime: '35 Mins',
    direction: 'East',
    position: [90, 5, -20],
    type: 'airport',
  },
  {
    id: 'towards-shadnagar',
    name: 'Towards Shadnagar / NH-44',
    subtitle: 'Bangalore Highway Industrial Growth Hub',
    distance: '18 km',
    travelTime: '20 Mins',
    direction: 'South',
    position: [-30, 4, 110],
    type: 'highway',
  },
  {
    id: 'towards-chevella',
    name: 'Towards Chevella & Srirampur SEZ',
    subtitle: 'Future Electronics & IT Corridor',
    distance: '12 km',
    travelTime: '15 Mins',
    direction: 'North',
    position: [-20, 4, -95],
    type: 'sez',
  },
]

export const VIAN_VALLEY_SECTORS: SectorView3D[] = [
  {
    id: 'overview',
    name: 'Masterplan Overview',
    cameraPosition: [0, 85, 120],
    target: [-5, 0, 10],
  },
  {
    id: 'phase-1',
    name: "BBG's Vian Valley-1",
    cameraPosition: [45, 45, 65],
    target: [38, 0, -5],
  },
  {
    id: 'phase-2',
    name: "BBG's Vian Valley-2",
    cameraPosition: [-25, 40, 50],
    target: [-25, 0, 0],
  },
  {
    id: 'jubilee-central',
    name: 'Vian BBG Jubilee Central',
    cameraPosition: [-45, 35, 95],
    target: [-45, 0, 45],
  },
  {
    id: 'resort-club',
    name: '30,000 Sq.Ft Resort Club',
    cameraPosition: [75, 25, 10],
    target: [62, 2, -10],
  },
]

export const VIAN_VALLEY_3D_PROJECT: Project3DData = {
  projectId: 'vv-shabad-001',
  projectName: "BBG's Vian Valley",
  slug: 'vian-vally',
  location: 'Shabad, Southwest Hyderabad',
  district: 'Ranga Reddy District',
  totalPlots: allPlots.length,
  availablePlots: availableCount,
  bookedPlots: bookedCount,
  soldPlots: soldCount,
  mortgagePlots: mortgageCount,
  ratePerSqYd: 12500,
  pdfLayoutUrl: '/documents/vian_valley_shabad_layout.pdf',
  sectors: VIAN_VALLEY_SECTORS,
  landmarks: VIAN_VALLEY_LANDMARKS,
  plots: allPlots,
}
