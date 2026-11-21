import { Project3DData, Plot3D, Landmark3D, SectorView3D } from './types'

// Transformation from layout pixel space to 3D satellite world space:
// The layout is mapped onto the 2048x2048 satellite texture at left: 374, top: 114, width: 1300, height: 1820
// The 3D satellite ground plane is 240 x 240 world units.
function pxToSatellite3D(layoutPxX: number, layoutPxY: number): [number, number, number] {
  const satPxX = 374 + (layoutPxX / 1385) * 1300
  const satPxY = 114 + (layoutPxY / 1940) * 1820
  const u = satPxX / 2048
  const v = satPxY / 2048
  const x = Number(((u - 0.5) * 240).toFixed(2))
  const z = Number(((v - 0.5) * 240).toFixed(2))
  return [x, 0.45, z]
}

function generateAllPlots(): Plot3D[] {
  const plots: Plot3D[] = []

  // 1. Exactly the 9 AVAILABLE plots requested by user:
  // 1309, 1301, 1245, 1246, 1247, 1253, 1284, 486, 698
  const availablePlotsData = [
    {
      num: '1309',
      px: 1160,
      py: 1070,
      w: 4.2,
      d: 5.6,
      facing: 'North' as const,
      sqYds: 201.6,
      dims: "33' × 55'",
      road: '33 Feet Sector Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '1301',
      px: 1160,
      py: 965,
      w: 4.2,
      d: 5.6,
      facing: 'North' as const,
      sqYds: 201.6,
      dims: "33' × 55'",
      road: '33 Feet Sector Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '1245',
      px: 1255,
      py: 1050,
      w: 4.6,
      d: 6.2,
      facing: 'East' as const,
      sqYds: 240,
      dims: "36' × 60'",
      road: '40 Feet Wide Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '1246',
      px: 1255,
      py: 1068,
      w: 4.6,
      d: 6.2,
      facing: 'East' as const,
      sqYds: 240,
      dims: "36' × 60'",
      road: '40 Feet Wide Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '1247',
      px: 1270,
      py: 1098,
      w: 6.2,
      d: 7.5,
      facing: 'Corner' as const,
      sqYds: 350,
      dims: "45' × 70'",
      road: '60 Feet Main Road × 40 Feet Cross Road',
      sector: 'Phase 1' as const,
      isCorner: true,
    },
    {
      num: '1253',
      px: 1235,
      py: 1135,
      w: 4.4,
      d: 6.0,
      facing: 'North' as const,
      sqYds: 220,
      dims: "33' × 60'",
      road: '33 Feet Sector Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '1284',
      px: 1195,
      py: 1135,
      w: 4.4,
      d: 6.0,
      facing: 'South' as const,
      sqYds: 220,
      dims: "33' × 60'",
      road: '33 Feet Sector Road',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '486',
      px: 1010,
      py: 725,
      w: 4.0,
      d: 5.4,
      facing: 'West' as const,
      sqYds: 167,
      dims: "30' × 50'",
      road: '40 Feet Sector Avenue',
      sector: 'Phase 1' as const,
      isCorner: false,
    },
    {
      num: '698',
      px: 930,
      py: 920,
      w: 4.8,
      d: 6.6,
      facing: 'East' as const,
      sqYds: 260,
      dims: "36' × 65'",
      road: '60 Feet Proposed Main Road',
      sector: 'Phase 1' as const,
      isCorner: true,
    },
  ]

  availablePlotsData.forEach((item) => {
    const pos = pxToSatellite3D(item.px, item.py)
    plots.push({
      id: `plot-${item.num}`,
      plotNumber: item.num,
      sector: item.sector,
      status: 'available',
      facing: item.facing,
      areaSqYds: item.sqYds,
      areaSqFt: Math.round(item.sqYds * 9),
      dimensions: item.dims,
      roadWidth: item.road,
      pricePerSqYd: 0,
      totalPrice: 0,
      isCorner: item.isCorner,
      isMortgage: false,
      position: [pos[0], 0.7, pos[2]],
      size: [item.w, 1.0, item.d],
    })
  })

  // 2. Realistic sold plots covering Phase 1, Phase 2, and Jubilee Central
  const resortSurrounding = [
    { num: '1248', px: 1270, py: 1130, w: 4.5, d: 5.5, f: 'East' as const },
    { num: '1249', px: 1270, py: 1160, w: 4.5, d: 5.5, f: 'East' as const },
    { num: '1250', px: 1270, py: 1190, w: 4.5, d: 5.5, f: 'East' as const },
    { num: '1302', px: 1160, py: 985, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1303', px: 1160, py: 1005, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1304', px: 1160, py: 1025, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1305', px: 1160, py: 1045, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1290', px: 1195, py: 970, w: 4.0, d: 5.2, f: 'West' as const },
    { num: '1291', px: 1195, py: 1000, w: 4.0, d: 5.2, f: 'West' as const },
    { num: '1292', px: 1195, py: 1030, w: 4.0, d: 5.2, f: 'West' as const },
    { num: '1293', px: 1195, py: 1060, w: 4.0, d: 5.2, f: 'West' as const },
    { num: '1270', px: 1235, py: 970, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1271', px: 1235, py: 1000, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1272', px: 1235, py: 1030, w: 4.0, d: 5.2, f: 'North' as const },
    { num: '1335', px: 1120, py: 970, w: 4.2, d: 5.5, f: 'West' as const },
    { num: '1336', px: 1120, py: 1000, w: 4.2, d: 5.5, f: 'West' as const },
    { num: '1337', px: 1120, py: 1030, w: 4.2, d: 5.5, f: 'West' as const },
    { num: '1338', px: 1120, py: 1060, w: 4.2, d: 5.5, f: 'West' as const },
    { num: '1339', px: 1120, py: 1090, w: 4.2, d: 5.5, f: 'West' as const },
    { num: '1340', px: 1120, py: 1120, w: 4.2, d: 5.5, f: 'West' as const },
  ]

  resortSurrounding.forEach((item) => {
    const pos = pxToSatellite3D(item.px, item.py)
    plots.push({
      id: `plot-${item.num}`,
      plotNumber: item.num,
      sector: 'Phase 1',
      status: 'sold',
      facing: item.f,
      areaSqYds: 200,
      areaSqFt: 1800,
      dimensions: "30' × 60'",
      roadWidth: '33 Feet Sector Road',
      pricePerSqYd: 0,
      totalPrice: 0,
      isCorner: false,
      isMortgage: false,
      position: [pos[0], 0.25, pos[2]],
      size: [item.w, 0.35, item.d],
    })
  })

  // Phase 1 Central Grid (Sold)
  const phase1Grid = [
    { num: '484', px: 1010, py: 690, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '485', px: 1010, py: 708, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '487', px: 1010, py: 742, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '488', px: 1010, py: 760, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '472', px: 980, py: 725, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '473', px: 980, py: 742, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '474', px: 980, py: 760, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '691', px: 930, py: 890, w: 4.5, d: 6.0, f: 'East' as const },
    { num: '692', px: 930, py: 865, w: 4.5, d: 6.0, f: 'East' as const },
    { num: '689', px: 930, py: 945, w: 4.5, d: 6.0, f: 'East' as const },
    { num: '688', px: 930, py: 970, w: 4.5, d: 6.0, f: 'East' as const },
    { num: '510', px: 1050, py: 650, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '511', px: 1050, py: 670, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '512', px: 1050, py: 690, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '513', px: 1050, py: 710, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '560', px: 1090, py: 650, w: 3.8, d: 5.0, f: 'South' as const },
    { num: '561', px: 1090, py: 670, w: 3.8, d: 5.0, f: 'South' as const },
    { num: '562', px: 1090, py: 690, w: 3.8, d: 5.0, f: 'South' as const },
    { num: '563', px: 1090, py: 710, w: 3.8, d: 5.0, f: 'South' as const },
    { num: '1050', px: 1050, py: 850, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '1051', px: 1050, py: 875, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '1052', px: 1050, py: 900, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '1053', px: 1050, py: 925, w: 3.8, d: 5.2, f: 'East' as const },
    { num: '1130', px: 1090, py: 850, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '1131', px: 1090, py: 875, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '1132', px: 1090, py: 900, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '1133', px: 1090, py: 925, w: 3.8, d: 5.2, f: 'West' as const },
    { num: '780', px: 885, py: 900, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '781', px: 885, py: 925, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '782', px: 885, py: 950, w: 3.8, d: 5.0, f: 'North' as const },
    { num: '783', px: 885, py: 975, w: 3.8, d: 5.0, f: 'North' as const },
  ]

  phase1Grid.forEach((item) => {
    const pos = pxToSatellite3D(item.px, item.py)
    plots.push({
      id: `plot-${item.num}`,
      plotNumber: item.num,
      sector: 'Phase 1',
      status: 'sold',
      facing: item.f,
      areaSqYds: 200,
      areaSqFt: 1800,
      dimensions: "30' × 60'",
      roadWidth: '40 Feet Road',
      pricePerSqYd: 0,
      totalPrice: 0,
      isCorner: false,
      isMortgage: false,
      position: [pos[0], 0.25, pos[2]],
      size: [item.w, 0.35, item.d],
    })
  })

  // Phase 2 Plots (Sold)
  const phase2Grid = [
    { num: '201', px: 620, py: 1000, w: 4.0, d: 5.5, f: 'North' as const },
    { num: '202', px: 645, py: 1000, w: 4.0, d: 5.5, f: 'North' as const },
    { num: '203', px: 670, py: 1000, w: 4.0, d: 5.5, f: 'North' as const },
    { num: '204', px: 695, py: 1000, w: 4.0, d: 5.5, f: 'North' as const },
    { num: '205', px: 720, py: 1000, w: 4.0, d: 5.5, f: 'North' as const },
    { num: '210', px: 620, py: 1035, w: 4.0, d: 5.5, f: 'South' as const },
    { num: '211', px: 645, py: 1035, w: 4.0, d: 5.5, f: 'South' as const },
    { num: '212', px: 670, py: 1035, w: 4.0, d: 5.5, f: 'South' as const },
    { num: '213', px: 695, py: 1035, w: 4.0, d: 5.5, f: 'South' as const },
    { num: '214', px: 720, py: 1035, w: 4.0, d: 5.5, f: 'South' as const },
    { num: '220', px: 560, py: 1100, w: 4.0, d: 5.5, f: 'East' as const },
    { num: '221', px: 560, py: 1125, w: 4.0, d: 5.5, f: 'East' as const },
    { num: '222', px: 560, py: 1150, w: 4.0, d: 5.5, f: 'East' as const },
    { num: '223', px: 560, py: 1175, w: 4.0, d: 5.5, f: 'East' as const },
    { num: '230', px: 590, py: 1100, w: 4.0, d: 5.5, f: 'West' as const },
    { num: '231', px: 590, py: 1125, w: 4.0, d: 5.5, f: 'West' as const },
    { num: '232', px: 590, py: 1150, w: 4.0, d: 5.5, f: 'West' as const },
    { num: '233', px: 590, py: 1175, w: 4.0, d: 5.5, f: 'West' as const },
  ]

  phase2Grid.forEach((item) => {
    const pos = pxToSatellite3D(item.px, item.py)
    plots.push({
      id: `plot-${item.num}`,
      plotNumber: item.num,
      sector: 'Phase 2',
      status: 'sold',
      facing: item.f,
      areaSqYds: 200,
      areaSqFt: 1800,
      dimensions: "30' × 60'",
      roadWidth: '40 Feet Road',
      pricePerSqYd: 0,
      totalPrice: 0,
      isCorner: false,
      isMortgage: false,
      position: [pos[0], 0.25, pos[2]],
      size: [item.w, 0.35, item.d],
    })
  })

  // Jubilee Central Plots (Near lake - Sold)
  const jcGrid = [
    { num: '301', px: 220, py: 1600, w: 4.2, d: 6.0, f: 'North' as const },
    { num: '302', px: 245, py: 1600, w: 4.2, d: 6.0, f: 'North' as const },
    { num: '303', px: 270, py: 1600, w: 4.2, d: 6.0, f: 'North' as const },
    { num: '304', px: 295, py: 1600, w: 4.2, d: 6.0, f: 'North' as const },
    { num: '305', px: 320, py: 1600, w: 4.2, d: 6.0, f: 'North' as const },
    { num: '310', px: 220, py: 1640, w: 4.2, d: 6.0, f: 'South' as const },
    { num: '311', px: 245, py: 1640, w: 4.2, d: 6.0, f: 'South' as const },
    { num: '312', px: 270, py: 1640, w: 4.2, d: 6.0, f: 'South' as const },
    { num: '313', px: 295, py: 1640, w: 4.2, d: 6.0, f: 'South' as const },
    { num: '314', px: 320, py: 1640, w: 4.2, d: 6.0, f: 'South' as const },
    { num: '320', px: 180, py: 1690, w: 4.2, d: 6.0, f: 'East' as const },
    { num: '321', px: 180, py: 1715, w: 4.2, d: 6.0, f: 'East' as const },
    { num: '322', px: 180, py: 1740, w: 4.2, d: 6.0, f: 'East' as const },
    { num: '325', px: 210, py: 1690, w: 4.2, d: 6.0, f: 'West' as const },
    { num: '326', px: 210, py: 1715, w: 4.2, d: 6.0, f: 'West' as const },
    { num: '327', px: 210, py: 1740, w: 4.2, d: 6.0, f: 'West' as const },
  ]

  jcGrid.forEach((item) => {
    const pos = pxToSatellite3D(item.px, item.py)
    plots.push({
      id: `plot-${item.num}`,
      plotNumber: item.num,
      sector: 'Jubilee Central',
      status: 'sold',
      facing: item.f,
      areaSqYds: 220,
      areaSqFt: 1980,
      dimensions: "33' × 60'",
      roadWidth: '33 Feet Road',
      pricePerSqYd: 0,
      totalPrice: 0,
      isCorner: false,
      isMortgage: false,
      position: [pos[0], 0.25, pos[2]],
      size: [item.w, 0.35, item.d],
    })
  })

  return plots
}

const allPlots: Plot3D[] = generateAllPlots()

const availableCount = allPlots.filter((p) => p.status === 'available').length
const bookedCount = allPlots.filter((p) => p.status === 'booked').length
const soldCount = allPlots.filter((p) => p.status === 'sold').length

export const VIAN_VALLEY_LANDMARKS: Landmark3D[] = [
  {
    id: 'chandanvelly-sez',
    name: 'Chandanvelly SEZ',
    subtitle: 'Amazon AWS Data Center & Welspun Flooring',
    distance: '6.5 km',
    travelTime: '10 Mins',
    direction: 'North-East',
    position: [78, 6, -65],
    type: 'sez',
  },
  {
    id: 'master-plan-road',
    name: '300 Ft Master Plan Road',
    subtitle: 'Connecting Regional Ring Road (RRR) Corridor',
    distance: 'Direct Access',
    travelTime: 'Adjacent',
    direction: 'Main Corridor',
    position: [-24, 4, -40],
    type: 'highway',
  },
  {
    id: 'shabad-municipality',
    name: 'Shabad Municipality',
    subtitle: 'Local Administrative & Commercial Hub',
    distance: '2.0 km',
    travelTime: '3 Mins',
    direction: 'West',
    position: [-85, 4, 35],
    type: 'civic',
  },
  {
    id: 'prrm-college',
    name: 'PRRM Engineering College',
    subtitle: 'Prominent Educational Institution',
    distance: '1.2 km',
    travelTime: '2 Mins',
    direction: 'South-West',
    position: [-65, 4, 55],
    type: 'education',
  },
  {
    id: 'mini-tank-bund',
    name: 'Mini Tank Bund Lake',
    subtitle: 'Scenic Waterbody & Eco Tourism Spot',
    distance: 'Walking Distance',
    travelTime: 'Adjacent',
    direction: 'South-West',
    position: [-88, 4, 98],
    type: 'lake',
  },
  {
    id: 'airport-shamshabad',
    name: 'RGIA Airport (Shamshabad)',
    subtitle: 'Via Chevella / ORR Expressway',
    distance: '32 km',
    travelTime: '35 Mins',
    direction: 'East',
    position: [100, 6, 20],
    type: 'airport',
  },
  {
    id: 'towards-shadnagar',
    name: 'Towards Shadnagar / NH-44',
    subtitle: 'Bangalore Highway Industrial Growth Hub',
    distance: '18 km',
    travelTime: '20 Mins',
    direction: 'South',
    position: [-30, 4, 115],
    type: 'highway',
  },
  {
    id: 'microsoft-dc',
    name: 'Microsoft Data Center',
    subtitle: 'Upcoming Hyperscale Cloud Infrastructure',
    distance: '14 km',
    travelTime: '15 Mins',
    direction: 'North-East',
    position: [65, 6, -95],
    type: 'sez',
  },
]

export const VIAN_VALLEY_SECTORS: SectorView3D[] = [
  {
    id: 'overview',
    name: 'Aerial 360° View',
    cameraPosition: [15, 110, 130],
    target: [25, 0, 10],
  },
  {
    id: 'phase-1',
    name: 'Vian Valley Phase 1',
    cameraPosition: [55, 45, 35],
    target: [50, 0, 12],
  },
  {
    id: 'phase-2',
    name: 'Vian Valley Phase 2',
    cameraPosition: [10, 42, 35],
    target: [8, 0, 15],
  },
  {
    id: 'jubilee-central',
    name: 'Vian Jubilee Central',
    cameraPosition: [-45, 45, 105],
    target: [-50, 0, 95],
  },
]

export const VIAN_VALLEY_3D_PROJECT: Project3DData = {
  projectId: 'vv-shabad-001',
  projectName: 'Vian Valley',
  slug: 'vian-vally',
  location: 'Shabad, Southwest Hyderabad',
  district: 'Ranga Reddy District',
  totalPlots: allPlots.length,
  availablePlots: availableCount,
  bookedPlots: bookedCount,
  soldPlots: soldCount,
  mortgagePlots: 0,
  ratePerSqYd: 0,
  pdfLayoutUrl: '/documents/vian_valley_shabad_layout.pdf',
  sectors: VIAN_VALLEY_SECTORS,
  landmarks: VIAN_VALLEY_LANDMARKS,
  plots: allPlots,
}
