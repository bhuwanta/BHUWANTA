'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Project3DData,
  Plot3D,
  PlotStatus,
  PlotFacing,
  PlotSector,
  Landmark3D,
} from '@/data/projects3d/types'
import {
  X,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  MapPin,
  CheckCircle2,
  Phone,
  FileText,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

// Color constants for plots and landscape
const STATUS_COLORS = {
  available: 0x10b981, // Emerald Green
  booked: 0xf59e0b,    // Amber Gold
  sold: 0xef4444,      // Crimson Red
  mortgage: 0x8b5cf6,  // Royal Purple
  highlight: 0xffd700, // Brilliant Gold
}

const STATUS_HOVER_COLORS = {
  available: 0x34d399,
  booked: 0xfbbf24,
  sold: 0xf87171,
  mortgage: 0xa78bfa,
  highlight: 0xffea75,
}

interface ProjectLayout3DViewerProps {
  project: Project3DData
  onClose?: () => void
  isModal?: boolean
  fullScreenPage?: boolean
  initialPlotId?: string
}

export function ProjectLayout3DViewer({
  project,
  onClose,
  isModal = false,
  fullScreenPage = false,
  initialPlotId,
}: ProjectLayout3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Interactive UI State
  const [selectedPlot, setSelectedPlot] = useState<Plot3D | null>(null)
  const [hoveredPlot, setHoveredPlot] = useState<Plot3D | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'layout' | 'landmarks' | 'pdf'>('layout')
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark3D | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | PlotStatus>('all')
  const [facingFilter, setFacingFilter] = useState<'all' | PlotFacing>('all')
  const [sectorFilter, setSectorFilter] = useState<'all' | PlotSector>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [is2DMode, setIs2DMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)

  // References for Three.js engine
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const plotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const plotOutlinesRef = useRef<Map<string, THREE.LineSegments>>(new Map())
  const plotLabelsRef = useRef<Map<string, THREE.Sprite>>(new Map())
  const animFrameId = useRef<number | null>(null)
  const cameraTransition = useRef<{
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    progress: number
    active: boolean
  } | null>(null)

  // Filtered plots count
  const filteredPlots = useMemo(() => {
    return project.plots.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (facingFilter !== 'all' && p.facing !== facingFilter) return false
      if (sectorFilter !== 'all' && p.sector !== sectorFilter) return false
      return true
    })
  }, [project.plots, statusFilter, facingFilter, sectorFilter])

  // Count summaries
  const stats = useMemo(() => {
    const total = project.plots.length
    const available = project.plots.filter((p) => p.status === 'available').length
    const booked = project.plots.filter((p) => p.status === 'booked').length
    const sold = project.plots.filter((p) => p.status === 'sold').length
    const mortgage = project.plots.filter((p) => p.status === 'mortgage').length
    return { total, available, booked, sold, mortgage }
  }, [project.plots])

  // Helper to smoothly animate camera
  const animateCameraTo = useCallback((targetPos: [number, number, number], targetLookAt: [number, number, number]) => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraTransition.current = {
      startPos: cameraRef.current.position.clone(),
      endPos: new THREE.Vector3(...targetPos),
      startTarget: controlsRef.current.target.clone(),
      endTarget: new THREE.Vector3(...targetLookAt),
      progress: 0,
      active: true,
    }
  }, [])

  // Create canvas texture for plot number billboard
  const createTextSprite = (text: string, color: string = '#ffffff') => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.roundRect(4, 4, 120, 56, 12)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 3
      ctx.roundRect(4, 4, 120, 56, 12)
      ctx.stroke()
      ctx.font = 'bold 32px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color
      ctx.fillText(text, 64, 34)
    }
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(3.2, 1.6, 1)
    return sprite
  }

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // 1. Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf1f5f9) // Crisp studio architectural slate-white
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.0035)
    sceneRef.current = scene

    // 2. Camera setup
    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1000)
    camera.position.set(0, 95, 130)
    cameraRef.current = camera

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    rendererRef.current = renderer

    // 4. Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.05 // Don't go below ground
    controls.minDistance = 15
    controls.maxDistance = 260
    controls.target.set(-5, 0, 10)
    controlsRef.current = controls

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.25)
    sunLight.position.set(60, 110, 50)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 300
    const d = 110
    sunLight.shadow.camera.left = -d
    sunLight.shadow.camera.right = d
    sunLight.shadow.camera.top = d
    sunLight.shadow.camera.bottom = -d
    sunLight.shadow.bias = -0.0005
    scene.add(sunLight)

    const hemiLight = new THREE.HemisphereLight(0xdff0d8, 0x94a3b8, 0.45)
    scene.add(hemiLight)

    // 6. Base Landscaping & Master Ground
    const groundGeo = new THREE.PlaneGeometry(320, 320)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe2ece1, // Soft lush meadow green
      roughness: 0.9,
      metalness: 0.05,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // Layout site boundary platform (slightly elevated)
    const sitePlatformGeo = new THREE.BoxGeometry(260, 0.2, 240)
    const sitePlatformMat = new THREE.MeshStandardMaterial({
      color: 0xd8e8d5,
      roughness: 0.85,
    })
    const sitePlatform = new THREE.Mesh(sitePlatformGeo, sitePlatformMat)
    sitePlatform.position.set(-5, 0.05, 10)
    sitePlatform.receiveShadow = true
    scene.add(sitePlatform)

    // Site boundary outline (glowing golden border)
    const siteBorderGeo = new THREE.EdgesGeometry(sitePlatformGeo)
    const siteBorderMat = new THREE.LineBasicMaterial({ color: 0xc4a55a, linewidth: 2 })
    const siteBorder = new THREE.LineSegments(siteBorderGeo, siteBorderMat)
    siteBorder.position.copy(sitePlatform.position)
    scene.add(siteBorder)

    // 7. ROADS (300 Ft Master Plan Road & Internal Avenues)
    const roadGroup = new THREE.Group()

    // 300 Ft Master Plan Road (Runs North-East to South-West)
    const main300FtGeo = new THREE.BoxGeometry(22, 0.25, 260)
    const roadAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    const main300FtRoad = new THREE.Mesh(main300FtGeo, roadAsphaltMat)
    main300FtRoad.position.set(-10, 0.15, 10)
    main300FtRoad.rotation.y = 0.35
    main300FtRoad.receiveShadow = true
    roadGroup.add(main300FtRoad)

    // Center divider stripe on 300ft Road
    const dividerGeo = new THREE.BoxGeometry(0.8, 0.28, 255)
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    const divider = new THREE.Mesh(dividerGeo, dividerMat)
    divider.position.copy(main300FtRoad.position)
    divider.rotation.y = 0.35
    roadGroup.add(divider)

    // Chandanvelly SEZ Road (Branching towards North-East)
    const sezRoadGeo = new THREE.BoxGeometry(14, 0.22, 160)
    const sezRoad = new THREE.Mesh(sezRoadGeo, roadAsphaltMat)
    sezRoad.position.set(-20, 0.14, -60)
    sezRoad.rotation.y = -0.7
    sezRoad.receiveShadow = true
    roadGroup.add(sezRoad)

    // Internal Phase 1 Spine Road (60 Ft Avenue)
    const phase1MainSpine = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 120), roadAsphaltMat)
    phase1MainSpine.position.set(4, 0.12, -8)
    phase1MainSpine.receiveShadow = true
    roadGroup.add(phase1MainSpine)

    // Phase 1 Cross Roads (40 Ft Roads)
    const crossRoadZ = [26, 16, 5, -6, -17, -27, -37]
    crossRoadZ.forEach((z) => {
      const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(85, 0.18, 5.5), roadAsphaltMat)
      crossRoad.position.set(42, 0.11, z)
      crossRoad.receiveShadow = true
      roadGroup.add(crossRoad)
    })

    // Phase 2 Internal Roads
    const p2RoadsZ = [21, 10, 0, -12, -22]
    p2RoadsZ.forEach((z) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(50, 0.18, 5), roadAsphaltMat)
      road.position.set(-35, 0.11, z)
      road.receiveShadow = true
      roadGroup.add(road)
    })

    // Jubilee Central Roads
    const jcRoadsZ = [66, 55, 44, 33]
    jcRoadsZ.forEach((z) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(45, 0.18, 4.5), roadAsphaltMat)
      road.position.set(-50, 0.11, z)
      road.receiveShadow = true
      roadGroup.add(road)
    })

    scene.add(roadGroup)

    // 8. 3D AMENITIES & FEATURES

    // A. 30,000 Sq.Ft World Class Resort Club
    const clubGroup = new THREE.Group()
    const clubBuildingGeo = new THREE.BoxGeometry(20, 6, 26)
    const clubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    const clubBuilding = new THREE.Mesh(clubBuildingGeo, clubMat)
    clubBuilding.position.set(82, 3, -12)
    clubBuilding.castShadow = true
    clubBuilding.receiveShadow = true
    clubGroup.add(clubBuilding)

    // Club Roof accent
    const clubRoof = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.8, 28),
      new THREE.MeshStandardMaterial({ color: 0x17543e, roughness: 0.3 })
    )
    clubRoof.position.set(82, 6.4, -12)
    clubGroup.add(clubRoof)

    // Swimming Pool
    const poolGeo = new THREE.BoxGeometry(12, 0.1, 16)
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.8 })
    const pool = new THREE.Mesh(poolGeo, poolMat)
    pool.position.set(82, 0.18, 8)
    clubGroup.add(pool)

    // Experience Center Pavilion
    const expCenter = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.4 })
    )
    expCenter.position.set(65, 2, -35)
    expCenter.castShadow = true
    clubGroup.add(expCenter)

    scene.add(clubGroup)

    // B. Mini Tank Bund (Lake / Water Body)
    const lakeGeo = new THREE.CylinderGeometry(24, 28, 0.4, 32)
    const lakeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.6 })
    const lake = new THREE.Mesh(lakeGeo, lakeMat)
    lake.position.set(-95, 0.1, 95)
    lake.scale.set(1.4, 1, 0.8)
    scene.add(lake)

    // C. 3D Avenue Trees along the main avenues
    const treeGroup = new THREE.Group()
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.6 })
    const treeGeoTrunk = new THREE.CylinderGeometry(0.25, 0.35, 2.5, 6)
    const treeGeoLeaves = new THREE.ConeGeometry(1.6, 4, 8)

    const createTree = (x: number, z: number) => {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(treeGeoTrunk, treeTrunkMat)
      trunk.position.y = 1.25
      trunk.castShadow = true
      tree.add(trunk)

      const leaves = new THREE.Mesh(treeGeoLeaves, treeLeavesMat)
      leaves.position.y = 3.6
      leaves.castShadow = true
      tree.add(leaves)

      tree.position.set(x, 0, z)
      return tree
    }

    // Plant trees along roads
    for (let i = -70; i <= 70; i += 14) {
      treeGroup.add(createTree(1, i))
      treeGroup.add(createTree(7, i))
    }
    for (let i = -40; i <= 40; i += 12) {
      treeGroup.add(createTree(i, 29))
      treeGroup.add(createTree(i, -40))
    }
    scene.add(treeGroup)

    // 9. 3D PLOTS CREATION
    plotMeshesRef.current.clear()
    plotOutlinesRef.current.clear()
    plotLabelsRef.current.clear()

    const plotGroup = new THREE.Group()

    project.plots.forEach((p) => {
      const [w, h, d] = p.size
      const [px, py, pz] = p.position

      // Extruded plot mesh
      const plotGeo = new THREE.BoxGeometry(w, h, d)
      const baseColor = STATUS_COLORS[p.status] || STATUS_COLORS.available
      const plotMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.5,
        metalness: 0.1,
      })

      const mesh = new THREE.Mesh(plotGeo, plotMat)
      mesh.position.set(px, py, pz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { plotId: p.id, plotData: p }

      // Blueprint edge outline
      const edgeGeo = new THREE.EdgesGeometry(plotGeo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: p.isCorner ? 0xffffff : 0x000000,
        linewidth: 1,
        transparent: true,
        opacity: 0.5,
      })
      const outline = new THREE.LineSegments(edgeGeo, edgeMat)
      outline.position.copy(mesh.position)

      // Plot Number Billboard Sprite
      const sprite = createTextSprite(p.plotNumber, p.isCorner ? '#ffd700' : '#ffffff')
      sprite.position.set(px, py + 1.2, pz)

      plotMeshesRef.current.set(p.id, mesh)
      plotOutlinesRef.current.set(p.id, outline)
      plotLabelsRef.current.set(p.id, sprite)

      plotGroup.add(mesh)
      plotGroup.add(outline)
      plotGroup.add(sprite)
    })

    scene.add(plotGroup)

    // 10. 3D LANDMARK BEACONS
    const landmarkGroup = new THREE.Group()
    const beaconGeo = new THREE.OctahedronGeometry(1.6, 0)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
    })

    project.landmarks.forEach((lm) => {
      const [lx, ly, lz] = lm.position
      const beacon = new THREE.Mesh(beaconGeo, beaconMat.clone())
      beacon.position.set(lx, ly, lz)
      beacon.userData = { landmarkId: lm.id, landmarkData: lm }

      // Beacon Stem
      const stemGeo = new THREE.CylinderGeometry(0.1, 0.1, ly, 6)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.6 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(lx, ly / 2, lz)

      // Pulsing Ring on Ground
      const ringGeo = new THREE.RingGeometry(1.5, 2.5, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(lx, 0.2, lz)

      // Landmark Name Billboard
      const labelSprite = createTextSprite(lm.name, '#0284c7')
      labelSprite.position.set(lx, ly + 2.2, lz)
      labelSprite.scale.set(5.5, 2.7, 1)

      landmarkGroup.add(beacon)
      landmarkGroup.add(stem)
      landmarkGroup.add(ring)
      landmarkGroup.add(labelSprite)
    })

    scene.add(landmarkGroup)

    // 11. Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(plotMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const hitPlot = hitMesh.userData.plotData as Plot3D
        setHoveredPlot(hitPlot)
        setTooltipPos({ x: e.clientX, y: e.clientY })
        canvas.style.cursor = 'pointer'
      } else {
        setHoveredPlot(null)
        setTooltipPos(null)
        canvas.style.cursor = 'grab'
      }
    }

    const onPointerDown = () => {
      canvas.style.cursor = 'grabbing'
    }

    const onPointerUp = (e: MouseEvent) => {
      canvas.style.cursor = 'grab'
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(plotMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const hitPlot = hitMesh.userData.plotData as Plot3D
        setSelectedPlot(hitPlot)

        // Smoothly focus camera towards selected plot
        const [px, , pz] = hitPlot.position
        animateCameraTo([px + 18, 25, pz + 25], [px, 0, pz])
      }
    }

    canvas.addEventListener('mousemove', onPointerMove)
    canvas.addEventListener('mousedown', onPointerDown)
    canvas.addEventListener('mouseup', onPointerUp)

    // 12. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 13. Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Handle smooth camera transition
      if (cameraTransition.current && cameraTransition.current.active) {
        const ct = cameraTransition.current
        ct.progress += delta * 1.8
        if (ct.progress >= 1) {
          ct.progress = 1
          ct.active = false
          camera.position.copy(ct.endPos)
          controls.target.copy(ct.endTarget)
        } else {
          // Smooth easeInOutCubic
          const t = ct.progress < 0.5 ? 4 * ct.progress * ct.progress * ct.progress : 1 - Math.pow(-2 * ct.progress + 2, 3) / 2
          camera.position.lerpVectors(ct.startPos, ct.endPos, t)
          controls.target.lerpVectors(ct.startTarget, ct.endTarget, t)
        }
      }

      // Gentle floating animation on landmark beacons
      beaconMat.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.25

      controls.update()
      renderer.render(scene, camera)
    }

    animate()
    setLoading(false)

    // Initial plot selection if requested
    if (initialPlotId) {
      const match = project.plots.find((p) => p.id === initialPlotId)
      if (match) {
        setSelectedPlot(match)
        const [px, , pz] = match.position
        animateCameraTo([px + 18, 25, pz + 25], [px, 0, pz])
      }
    }

    // Cleanup
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', onPointerMove)
      canvas.removeEventListener('mousedown', onPointerDown)
      canvas.removeEventListener('mouseup', onPointerUp)
      renderer.dispose()
    }
  }, [project, animateCameraTo, initialPlotId])

  // Update Plot Mesh Visuals when filters, selection, or hover changes
  useEffect(() => {
    project.plots.forEach((p) => {
      const mesh = plotMeshesRef.current.get(p.id)
      const outline = plotOutlinesRef.current.get(p.id)
      const label = plotLabelsRef.current.get(p.id)
      if (!mesh || !outline || !label) return

      const isSelected = selectedPlot?.id === p.id
      const isHovered = hoveredPlot?.id === p.id

      // Check if filtered out
      const matchesFilter =
        (statusFilter === 'all' || p.status === statusFilter) &&
        (facingFilter === 'all' || p.facing === facingFilter) &&
        (sectorFilter === 'all' || p.sector === sectorFilter)

      const mat = mesh.material as THREE.MeshStandardMaterial

      if (!matchesFilter) {
        // Dim out non-matching plots
        mat.color.setHex(0x94a3b8)
        mat.opacity = 0.25
        mat.transparent = true
        mesh.position.y = 0.1
        outline.visible = false
        label.visible = false
      } else {
        mat.transparent = false
        mat.opacity = 1.0
        outline.visible = true
        label.visible = true

        if (isSelected) {
          mat.color.setHex(STATUS_COLORS.highlight)
          mesh.position.y = 0.8 // Lift selected plot
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + 1.4
        } else if (isHovered) {
          mat.color.setHex(STATUS_HOVER_COLORS[p.status])
          mesh.position.y = 0.5 // Lift hovered plot
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + 1.4
        } else {
          mat.color.setHex(STATUS_COLORS[p.status])
          mesh.position.y = p.position[1]
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + 1.2
        }
      }
    })
  }, [project.plots, selectedPlot, hoveredPlot, statusFilter, facingFilter, sectorFilter])

  // Handle Sector Camera Jumps
  const handleJumpToSector = (sectorId: string) => {
    const sec = project.sectors.find((s) => s.id === sectorId)
    if (!sec) return
    animateCameraTo(sec.cameraPosition, sec.target)
  }

  // Toggle 2D / 3D camera
  const handleToggle2D = () => {
    if (!is2DMode) {
      animateCameraTo([0, 150, 5], [0, 0, 5]) // True top-down blueprint view
      setIs2DMode(true)
    } else {
      animateCameraTo([0, 85, 120], [-5, 0, 10]) // Standard isometric 3D view
      setIs2DMode(false)
    }
  }

  // Reset Camera
  const handleResetCamera = () => {
    animateCameraTo([0, 85, 120], [-5, 0, 10])
    setIs2DMode(false)
  }

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none bg-slate-900 font-sans ${
        fullScreenPage
          ? 'h-[calc(100vh-3.5rem)] rounded-none border-none'
          : isModal
          ? 'h-[90vh] rounded-2xl shadow-2xl border border-brand-border/40'
          : 'h-[750px] md:h-[820px] rounded-2xl border border-brand-border'
      }`}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white">
          <div className="w-12 h-12 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide text-brand-gold uppercase">Loading 3D Venture Map...</p>
          <p className="text-xs text-slate-400 mt-1">Generating plot coordinates &amp; real-time inventory</p>
        </div>
      )}

      {/* TOP HUD BAR */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 md:p-4 bg-gradient-to-b from-slate-950/85 via-slate-950/60 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-auto">
          {/* Project Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-primary/80 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  {project.projectName} <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">3D Interactive</span>
                </h1>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-gold" /> {project.location}
              </p>
            </div>
          </div>

          {/* Real-time Inventory Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-medium backdrop-blur-sm">
              Total: <span className="font-bold text-white">{stats.total}</span>
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'available'
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                  : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Available: <span className="font-bold">{stats.available}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'booked'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Booked: <span className="font-bold">{stats.booked}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'sold'
                  ? 'bg-red-500 text-white ring-2 ring-red-300'
                  : 'bg-red-950/70 border border-red-500/40 text-red-300 hover:bg-red-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Sold: <span className="font-bold">{stats.sold}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'mortgage' ? 'all' : 'mortgage')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'mortgage'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                  : 'bg-purple-950/70 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Mortgage: <span className="font-bold">{stats.mortgage}</span>
            </button>

            {/* Close / Fullscreen buttons */}
            <div className="flex items-center gap-1.5 ml-auto md:ml-2">
              <button
                onClick={handleToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  title="Close 3D View"
                  className="w-8 h-8 rounded-lg bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECONDARY FILTER BAR */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          {/* Sector Quick Jump */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Sector:</span>
            {project.sectors.map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleJumpToSector(sec.id)}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer hover:border-brand-gold/60"
              >
                {sec.name}
              </button>
            ))}
          </div>

          {/* Facing Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Facing:</span>
            {(['all', 'East', 'North', 'West', 'Corner'] as const).map((face) => (
              <button
                key={face}
                onClick={() => setFacingFilter(face)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  facingFilter === face
                    ? 'bg-brand-gold text-slate-950 font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                {face}
              </button>
            ))}

            {/* Toggle 2D / 3D Switch */}
            <button
              onClick={handleToggle2D}
              className={`ml-2 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                is2DMode
                  ? 'bg-brand-primary text-brand-gold border-brand-gold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {is2DMode ? '3D View' : '2D Map'}
            </button>

            <button
              onClick={handleResetCamera}
              title="Reset View"
              className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING CURSOR TOOLTIP (When Hovering Plot in 3D) */}
      {hoveredPlot && tooltipPos && !selectedPlot && (
        <div
          className="fixed pointer-events-none z-40 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-slate-900/95 border border-brand-gold/60 text-white shadow-xl backdrop-blur-md"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-brand-gold">Plot #{hoveredPlot.plotNumber}</span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                hoveredPlot.status === 'available'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : hoveredPlot.status === 'booked'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : hoveredPlot.status === 'sold'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              }`}
            >
              {hoveredPlot.status}
            </span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
            <span>{hoveredPlot.areaSqYds} Sq. Yds</span>
            <span>•</span>
            <span>{hoveredPlot.facing} Facing</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 italic">Click for full details &amp; booking quote</p>
        </div>
      )}

      {/* LEFT-SIDE SLIDE-OUT PLOT DETAILS PANEL */}
      {selectedPlot && (
        <div className="absolute top-24 md:top-28 left-4 bottom-6 z-30 w-[92%] sm:w-[360px] md:w-[380px] bg-slate-900/95 border border-brand-gold/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            {/* Header with Close */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Plot #{selectedPlot.plotNumber}
                  </h2>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedPlot.status === 'available'
                        ? 'bg-emerald-500 text-white'
                        : selectedPlot.status === 'booked'
                        ? 'bg-amber-500 text-white'
                        : selectedPlot.status === 'sold'
                        ? 'bg-red-500 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {selectedPlot.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selectedPlot.sector} • {project.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key Metric Cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Plot Area</span>
                <span className="text-lg font-bold text-white block mt-0.5">{selectedPlot.areaSqYds} <span className="text-xs font-normal text-slate-300">Sq. Yds</span></span>
                <span className="text-[11px] text-slate-400">({selectedPlot.areaSqFt} Sq. Ft.)</span>
              </div>
              <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Facing &amp; Vastu</span>
                <span className="text-lg font-bold text-brand-gold block mt-0.5">{selectedPlot.facing}</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 100% Vastu</span>
              </div>
            </div>

            {/* Detailed Spec List */}
            <div className="mt-4 space-y-2 text-xs bg-slate-800/40 rounded-xl p-3.5 border border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Dimensions</span>
                <span className="font-semibold text-white">{selectedPlot.dimensions}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Road Width</span>
                <span className="font-semibold text-white">{selectedPlot.roadWidth}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Plot Category</span>
                <span className="font-semibold text-white">{selectedPlot.isCorner ? 'Premium Corner Plot' : 'Standard Residential Plot'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Pricing &amp; Cost Sheet</span>
                <span className="font-semibold text-brand-gold">Available on Request</span>
              </div>
            </div>

            {/* Verified Plot Card */}
            <div className="mt-4 bg-slate-800/60 border border-brand-gold/30 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center gap-2 text-brand-gold font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <span>HMDA Sanctioned Layout Boundary</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Clear title, spot registration eligible, ready for construction with full boundary demarcation.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 space-y-2">
            {selectedPlot.status === 'available' ? (
              <a
                href={`/projects/${project.slug}#book-visit`}
                onClick={() => {
                  // Pre-fill enquiry if contact form exists on page
                  const noteField = document.querySelector('textarea[name="notes"], input[name="notes"]') as HTMLInputElement | null
                  if (noteField) {
                    noteField.value = `I am interested in Plot #${selectedPlot.plotNumber} (${selectedPlot.areaSqYds} Sq. Yds, ${selectedPlot.facing} Facing) in ${project.projectName}.`
                  }
                  if (onClose) onClose()
                }}
                className="w-full py-3 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-slate-950 font-bold text-sm text-center flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Request Quote for Plot #{selectedPlot.plotNumber}
              </a>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-800 text-center text-xs text-slate-400 border border-slate-700">
                This plot is currently <span className="font-bold uppercase text-white">{selectedPlot.status}</span>. Inquire about waitlist or similar adjoining plots.
              </div>
            )}

            <a
              href={`https://wa.me/919666504405?text=${encodeURIComponent(
                `Hi Bhuwanta, I am viewing the 3D Layout of ${project.projectName} and interested in Plot #${selectedPlot.plotNumber} (${selectedPlot.areaSqYds} Sq. Yds, ${selectedPlot.facing} Facing, Status: ${selectedPlot.status}). Please share availability and payment plan.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs sm:text-sm text-center flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Phone className="w-4 h-4" /> Chat on WhatsApp for Plot #{selectedPlot.plotNumber}
            </a>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL DOCK */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md text-white text-xs">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'layout' ? 'bg-brand-primary text-brand-gold border border-brand-gold/40' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 3D Layout
        </button>
        <button
          onClick={() => setActiveTab('landmarks')}
          className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'landmarks' ? 'bg-brand-primary text-brand-gold border border-brand-gold/40' : 'text-slate-300 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Nearby Locations ({project.landmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pdf' ? 'bg-brand-primary text-brand-gold border border-brand-gold/40' : 'text-slate-300 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Official 2D Blueprint
        </button>
      </div>

      {/* NEARBY LOCATIONS OVERLAY DRAWER */}
      {activeTab === 'landmarks' && (
        <div className="absolute bottom-16 left-4 right-4 md:left-auto md:right-4 md:w-96 max-h-[60vh] z-30 bg-slate-900/95 border border-brand-gold/40 shadow-2xl rounded-2xl p-4 backdrop-blur-xl text-white overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-gold" /> Key Connectivity Highlights
            </h3>
            <button onClick={() => setActiveTab('layout')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1 mb-3">Click any destination to orient the 3D camera towards that corridor:</p>
          <div className="space-y-2">
            {project.landmarks.map((lm) => (
              <div
                key={lm.id}
                onClick={() => {
                  setSelectedLandmark(lm)
                  const [lx, , lz] = lm.position
                  animateCameraTo([lx * 0.7, 35, lz * 0.7 + 35], [lx, 0, lz])
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                  selectedLandmark?.id === lm.id
                    ? 'bg-brand-primary/80 border-brand-gold'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                    {lm.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{lm.subtitle}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                    Direction: {lm.direction}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-xs text-emerald-400 block">{lm.travelTime}</span>
                  <span className="text-[10px] text-slate-400">{lm.distance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OFFICIAL 2D BLUEPRINT MODAL OVERLAY */}
      {activeTab === 'pdf' && (
        <div className="absolute inset-4 md:inset-8 z-30 bg-slate-950/95 border border-brand-gold/40 shadow-2xl rounded-2xl p-4 backdrop-blur-xl text-white flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-gold" /> Official Sanctioned 2D Master Plan
              </h3>
              <p className="text-xs text-slate-400">Extracted from Sanity layout documents for {project.projectName} (Shabad)</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={project.pdfLayoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/80 transition-colors flex items-center gap-1.5"
              >
                Download Original PDF
              </a>
              <button onClick={() => setActiveTab('layout')} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full mt-3 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center p-2">
            <img
              src="/images/projects/vian_valley_layout.png"
              alt="Official Vian Valley Shabad Layout"
              className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                // Fallback to sanity PDF link
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
