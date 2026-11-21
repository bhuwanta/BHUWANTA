'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Project3DData,
  Plot3D,
  PlotStatus,
  Landmark3D,
} from '@/data/projects3d/types'
import {
  X,
  CheckCircle2,
  Phone,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Search,
  Navigation,
  Download,
  Share2,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

// MapX Color & Design Tokens
const MAPX_COLORS = {
  bg: '#0a1120',
  glass: 'rgba(10, 17, 32, 0.88)',
  line: 'rgba(255, 255, 255, 0.13)',
  ink: '#f4f6fa',
  mut: '#a9b6ca',
  gold: '#e9b95c',
  cyan: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
}

// Strict Plot Status Colors: Available (Green), Booked (Yellow), Sold (Red)
const STATUS_COLORS = {
  available: 0x10b981, // Emerald Green
  booked: 0xf59e0b,    // Amber Yellow
  sold: 0xef4444,      // Crimson Red
  highlight: 0xe9b95c, // Radiant Gold
}

const STATUS_HOVER_COLORS = {
  available: 0x34d399,
  booked: 0xfcd34d,
  sold: 0xf87171,
  highlight: 0xfde047,
}

type ViewerMode = 'aerial' | 'plot-details' | 'project-details' | 'nearby' | 'orr-rrr'

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
  const [activeMode, setActiveMode] = useState<ViewerMode>('aerial')
  const [selectedPlot, setSelectedPlot] = useState<Plot3D | null>(null)
  const [hoveredPlot, setHoveredPlot] = useState<Plot3D | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark3D | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'sold'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [compassAngle, setCompassAngle] = useState(0)
  const [tourStarted, setTourStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const groundMeshRef = useRef<THREE.Mesh | null>(null)
  const orrMeshGroupRef = useRef<THREE.Group | null>(null)
  const nearbySplinesRef = useRef<THREE.Group | null>(null)
  const plotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const plotOutlinesRef = useRef<Map<string, THREE.LineSegments>>(new Map())
  const plotLabelsRef = useRef<Map<string, THREE.Sprite>>(new Map())
  const beaconRingsRef = useRef<THREE.Mesh[]>([])
  const centerProjectPinRef = useRef<THREE.Group | null>(null)
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null)
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const animFrameId = useRef<number | null>(null)

  // Camera glide controller
  const cameraTransition = useRef<{
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    progress: number
    active: boolean
  } | null>(null)

  // Summaries (Available: 9, Booked: 0, Sold: 151)
  const stats = useMemo(() => {
    const total = project.plots.length
    const available = project.plots.filter((p) => p.status === 'available').length
    const booked = project.plots.filter((p) => p.status === 'booked').length
    const sold = project.plots.filter((p) => p.status === 'sold').length
    return { total, available, booked, sold }
  }, [project.plots])

  // Camera smooth glide
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

  // Create Billboard Sprite for Plots
  const createPlotSprite = (text: string, isAvailable: boolean) => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 70
    const ctx = canvas.getContext('2d')
    if (ctx) {
      if (isAvailable) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'
        ctx.roundRect(4, 4, 152, 62, 16)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.roundRect(4, 4, 152, 62, 16)
        ctx.stroke()
        ctx.font = 'bold 30px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Plot ${text}`, 80, 35)
      } else {
        ctx.fillStyle = 'rgba(10, 17, 32, 0.85)'
        ctx.roundRect(6, 6, 148, 58, 12)
        ctx.fill()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
        ctx.lineWidth = 2
        ctx.roundRect(6, 6, 148, 58, 12)
        ctx.stroke()
        ctx.font = 'bold 26px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#f87171'
        ctx.fillText(text, 80, 35)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(isAvailable ? 4.8 : 3.2, isAvailable ? 2.2 : 1.5, 1)
    return sprite
  }

  // Create Central Floating 3D Beacon for the Project (Exact MapX Arudra Exotica Badge Style)
  const createProjectCenterBeacon = (name: string, subtitle: string) => {
    const group = new THREE.Group()

    const stemGeo = new THREE.CylinderGeometry(0.2, 0.2, 16, 8)
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 })
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 8
    group.add(stem)

    const ringGeo = new THREE.RingGeometry(2.5, 4.5, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.2
    group.add(ring)

    const canvas = document.createElement('canvas')
    canvas.width = 440
    canvas.height = 140
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 17, 32, 0.95)'
      ctx.roundRect(8, 8, 424, 124, 28)
      ctx.fill()
      ctx.strokeStyle = '#06b6d4'
      ctx.lineWidth = 4
      ctx.roundRect(8, 8, 424, 124, 28)
      ctx.stroke()

      ctx.fillStyle = '#0e7490'
      ctx.beginPath()
      ctx.arc(60, 70, 36, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = 'bold 24px Poppins, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('BV', 60, 70)

      ctx.textAlign = 'left'
      ctx.font = '900 32px Poppins, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(name.toUpperCase(), 115, 54)

      ctx.fillStyle = '#0891b2'
      ctx.roundRect(115, 78, 280, 34, 17)
      ctx.fill()
      ctx.font = 'bold 16px Poppins, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(subtitle.toUpperCase(), 255, 96)
    }

    const badgeTex = new THREE.CanvasTexture(canvas)
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false })
    const badgeSprite = new THREE.Sprite(badgeMat)
    badgeSprite.position.set(0, 18, 0)
    badgeSprite.scale.set(16, 5.2, 1)
    group.add(badgeSprite)

    return group
  }

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1120)
    scene.fog = new THREE.FogExp2(0x0a1120, 0.0022)
    sceneRef.current = scene

    // 2. Camera
    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 1400)
    camera.position.set(30, 115, 130)
    cameraRef.current = camera

    // 3. Renderer
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

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.08
    controls.minDistance = 15
    controls.maxDistance = 320
    controls.target.set(35, 0, 5)
    controlsRef.current = controls

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)
    ambientLightRef.current = ambientLight

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4)
    sunLight.position.set(80, 140, 70)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 450
    const d = 140
    sunLight.shadow.camera.left = -d
    sunLight.shadow.camera.right = d
    sunLight.shadow.camera.top = d
    sunLight.shadow.camera.bottom = -d
    sunLight.shadow.bias = -0.0004
    scene.add(sunLight)
    directionalLightRef.current = sunLight

    // 6. Base Ground Platform with Authentic Aerial Satellite Terrain
    const groundGeo = new THREE.PlaneGeometry(240, 240)
    const textureLoader = new THREE.TextureLoader()

    const satelliteTex = textureLoader.load(
      '/images/projects/vian_valley_satellite_aerial.jpg',
      () => setLoading(false)
    )
    satelliteTex.colorSpace = THREE.SRGBColorSpace
    satelliteTex.generateMipmaps = true
    satelliteTex.minFilter = THREE.LinearMipmapLinearFilter
    satelliteTex.magFilter = THREE.LinearFilter
    satelliteTex.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const groundMat = new THREE.MeshStandardMaterial({
      map: satelliteTex,
      roughness: 0.75,
      metalness: 0.05,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.set(0, 0, 0)
    groundMesh.receiveShadow = true
    scene.add(groundMesh)
    groundMeshRef.current = groundMesh

    // Subtle dark foundation base
    const foundationGeo = new THREE.BoxGeometry(250, 3, 250)
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x0a1120, roughness: 0.9 })
    const foundation = new THREE.Mesh(foundationGeo, foundationMat)
    foundation.position.set(0, -1.6, 0)
    scene.add(foundation)

    // 7. Central Floating Project Beacon (MapX Style)
    const centerBeacon = createProjectCenterBeacon('Vian Valley', '160 Villa Plots • Shabad')
    centerBeacon.position.set(45, 0, 8)
    scene.add(centerBeacon)
    centerProjectPinRef.current = centerBeacon

    // 8. Interactive 3D Plots
    plotMeshesRef.current.clear()
    plotOutlinesRef.current.clear()
    plotLabelsRef.current.clear()
    beaconRingsRef.current = []

    const plotGroup = new THREE.Group()

    project.plots.forEach((p) => {
      const [w, h, d] = p.size
      const [px, py, pz] = p.position
      const isAvailable = p.status === 'available'

      const plotGeo = new THREE.BoxGeometry(w, h, d)
      const baseColor = isAvailable ? STATUS_COLORS.available : STATUS_COLORS.sold
      const plotMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: isAvailable ? 0.3 : 0.65,
        metalness: isAvailable ? 0.2 : 0.05,
        transparent: !isAvailable,
        opacity: isAvailable ? 1.0 : 0.45,
        emissive: isAvailable ? 0x059669 : 0x000000,
        emissiveIntensity: isAvailable ? 0.45 : 0,
      })

      const mesh = new THREE.Mesh(plotGeo, plotMat)
      mesh.position.set(px, py, pz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { plotId: p.id, plotData: p }

      const edgeGeo = new THREE.EdgesGeometry(plotGeo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: isAvailable ? 0xffffff : 0xef4444,
        linewidth: isAvailable ? 2 : 1,
        transparent: true,
        opacity: isAvailable ? 0.95 : 0.45,
      })
      const outline = new THREE.LineSegments(edgeGeo, edgeMat)
      outline.position.copy(mesh.position)

      const sprite = createPlotSprite(p.plotNumber, isAvailable)
      sprite.position.set(px, py + (isAvailable ? 2.5 : 1.2), pz)

      if (isAvailable) {
        const ringGeo = new THREE.RingGeometry(Math.max(w, d) * 0.6, Math.max(w, d) * 0.9, 24)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.set(px, 0.08, pz)
        plotGroup.add(ring)
        beaconRingsRef.current.push(ring)
      }

      plotMeshesRef.current.set(p.id, mesh)
      plotOutlinesRef.current.set(p.id, outline)
      plotLabelsRef.current.set(p.id, sprite)

      plotGroup.add(mesh)
      plotGroup.add(outline)
      plotGroup.add(sprite)
    })

    scene.add(plotGroup)

    // 9. Nearby Landmarks & Highway Route Splines (MapX Mode 4)
    const nearbyGroup = new THREE.Group()
    const splinesGroup = new THREE.Group()

    const beaconGeo = new THREE.OctahedronGeometry(1.8, 0)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xa855f7,
      emissiveIntensity: 0.6,
    })

    project.landmarks.forEach((lm) => {
      const [lx, ly, lz] = lm.position
      const beacon = new THREE.Mesh(beaconGeo, beaconMat.clone())
      beacon.position.set(lx, ly, lz)
      beacon.userData = { landmarkId: lm.id, landmarkData: lm }

      const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, ly, 6)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(lx, ly / 2, lz)

      const ringGeo = new THREE.RingGeometry(1.6, 2.8, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(lx, 0.1, lz)

      // Landmark Pill
      const canvas = document.createElement('canvas')
      canvas.width = 280
      canvas.height = 76
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(10, 17, 32, 0.94)'
        ctx.roundRect(4, 4, 272, 68, 16)
        ctx.fill()
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 3
        ctx.roundRect(4, 4, 272, 68, 16)
        ctx.stroke()
        ctx.font = 'bold 23px Poppins, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(lm.name, 140, 28)
        ctx.font = 'bold 18px Poppins, sans-serif'
        ctx.fillStyle = '#fef08a'
        ctx.fillText(`${lm.travelTime} • ${lm.distance}`, 140, 52)
      }
      const labelTex = new THREE.CanvasTexture(canvas)
      const labelSpriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
      const labelSprite = new THREE.Sprite(labelSpriteMat)
      labelSprite.position.set(lx, ly + 2.8, lz)
      labelSprite.scale.set(7.4, 2.9, 1)

      nearbyGroup.add(beacon)
      nearbyGroup.add(stem)
      nearbyGroup.add(ring)
      nearbyGroup.add(labelSprite)

      // Curved highway spline line
      const projectOrigin = new THREE.Vector3(45, 0.2, 8)
      const landmarkTarget = new THREE.Vector3(lx, 0.2, lz)
      const midPoint = new THREE.Vector3(
        (projectOrigin.x + landmarkTarget.x) / 2 + (Math.random() - 0.5) * 8,
        1.5,
        (projectOrigin.z + landmarkTarget.z) / 2 + (Math.random() - 0.5) * 8
      )
      const curve = new THREE.QuadraticBezierCurve3(projectOrigin, midPoint, landmarkTarget)
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.22, 6, false)
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      splinesGroup.add(tube)
    })

    scene.add(nearbyGroup)
    scene.add(splinesGroup)
    nearbySplinesRef.current = splinesGroup

    // 10. ORR & RRR Macro Rings Mode (MapX Mode 5)
    const orrGroup = new THREE.Group()
    orrGroup.visible = false

    const orrRadius = 45
    const orrCurve = new THREE.EllipseCurve(0, 0, orrRadius * 1.1, orrRadius, 0, 2 * Math.PI, false, 0)
    const orrPoints = orrCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, 0.4, p.y))
    const orrGeo = new THREE.BufferGeometry().setFromPoints(orrPoints)
    const orrMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 4 })
    const orrLine = new THREE.Line(orrGeo, orrMat)
    orrGroup.add(orrLine)

    const rrrRadius = 85
    const rrrCurve = new THREE.EllipseCurve(0, 0, rrrRadius * 1.05, rrrRadius, 0, 2 * Math.PI, false, 0)
    const rrrPoints = rrrCurve.getPoints(96).map((p) => new THREE.Vector3(p.x, 0.4, p.y))
    const rrrGeo = new THREE.BufferGeometry().setFromPoints(rrrPoints)
    const rrrMat = new THREE.LineDashedMaterial({ color: 0xf97316, dashSize: 3, gapSize: 2 })
    const rrrLine = new THREE.Line(rrrGeo, rrrMat)
    rrrLine.computeLineDistances()
    orrGroup.add(rrrLine)

    scene.add(orrGroup)
    orrMeshGroupRef.current = orrGroup

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

    const onPointerUp = (e: MouseEvent) => {
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
        setActiveMode('plot-details')

        const [px, , pz] = hitPlot.position
        animateCameraTo([px + 14, 22, pz + 20], [px, 0, pz])
      }
    }

    canvas.addEventListener('mousemove', onPointerMove)
    canvas.addEventListener('mouseup', onPointerUp)

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Animation loop & Compass orientation tracking
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      if (cameraTransition.current && cameraTransition.current.active) {
        const ct = cameraTransition.current
        ct.progress += delta * 1.8
        if (ct.progress >= 1) {
          ct.progress = 1
          ct.active = false
          camera.position.copy(ct.endPos)
          controls.target.copy(ct.endTarget)
        } else {
          const t = ct.progress < 0.5 ? 4 * ct.progress * ct.progress * ct.progress : 1 - Math.pow(-2 * ct.progress + 2, 3) / 2
          camera.position.lerpVectors(ct.startPos, ct.endPos, t)
          controls.target.lerpVectors(ct.startTarget, ct.endTarget, t)
        }
      }

      beaconRingsRef.current.forEach((ring) => {
        const scale = 1 + Math.sin(time * 3) * 0.12
        ring.scale.set(scale, scale, 1)
      })

      // Track compass azimuth angle
      const azimuth = controls.getAzimuthalAngle()
      setCompassAngle((azimuth * 180) / Math.PI)

      controls.autoRotate = false
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    if (initialPlotId) {
      const match = project.plots.find((p) => p.id === initialPlotId)
      if (match) {
        setSelectedPlot(match)
        setActiveMode('plot-details')
        const [px, , pz] = match.position
        animateCameraTo([px + 14, 22, pz + 20], [px, 0, pz])
      }
    }

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', onPointerMove)
      canvas.removeEventListener('mouseup', onPointerUp)
      renderer.dispose()
    }
  }, [project, animateCameraTo, initialPlotId])

  // Mode Transition Handler
  const handleSwitchMode = (mode: ViewerMode) => {
    setActiveMode(mode)
    const textureLoader = new THREE.TextureLoader()

    if (mode === 'aerial') {
      if (groundMeshRef.current) {
        groundMeshRef.current.material = new THREE.MeshStandardMaterial({
          map: textureLoader.load('/images/projects/vian_valley_satellite_aerial.jpg'),
          roughness: 0.75,
        })
      }
      if (orrMeshGroupRef.current) orrMeshGroupRef.current.visible = false
      if (nearbySplinesRef.current) nearbySplinesRef.current.visible = false
      if (centerProjectPinRef.current) centerProjectPinRef.current.visible = true
      animateCameraTo([30, 115, 130], [35, 0, 5])
    } else if (mode === 'plot-details') {
      if (groundMeshRef.current) {
        groundMeshRef.current.material = new THREE.MeshStandardMaterial({
          map: textureLoader.load('/images/projects/vian_valley_satellite_aerial.jpg'),
          roughness: 0.75,
        })
      }
      if (orrMeshGroupRef.current) orrMeshGroupRef.current.visible = false
      if (nearbySplinesRef.current) nearbySplinesRef.current.visible = false
      if (centerProjectPinRef.current) centerProjectPinRef.current.visible = false
      animateCameraTo([50, 70, 75], [52, 0, 12])
    } else if (mode === 'project-details') {
      if (groundMeshRef.current) {
        groundMeshRef.current.material = new THREE.MeshStandardMaterial({
          map: textureLoader.load('/images/projects/vian_valley_satellite_aerial.jpg'),
          roughness: 0.75,
        })
      }
      if (orrMeshGroupRef.current) orrMeshGroupRef.current.visible = false
      if (nearbySplinesRef.current) nearbySplinesRef.current.visible = false
      if (centerProjectPinRef.current) centerProjectPinRef.current.visible = true
      animateCameraTo([40, 95, 95], [45, 0, 10])
    } else if (mode === 'nearby') {
      if (groundMeshRef.current) {
        groundMeshRef.current.material = new THREE.MeshStandardMaterial({
          map: textureLoader.load('/images/projects/vian_valley_satellite_aerial.jpg'),
          roughness: 0.75,
        })
      }
      if (orrMeshGroupRef.current) orrMeshGroupRef.current.visible = false
      if (nearbySplinesRef.current) nearbySplinesRef.current.visible = true
      if (centerProjectPinRef.current) centerProjectPinRef.current.visible = true
      animateCameraTo([10, 140, 150], [20, 0, 0])
    } else if (mode === 'orr-rrr') {
      if (groundMeshRef.current) {
        groundMeshRef.current.material = new THREE.MeshStandardMaterial({
          map: textureLoader.load('/images/projects/hyderabad_macro_satellite.jpg'),
          roughness: 0.75,
        })
      }
      if (orrMeshGroupRef.current) orrMeshGroupRef.current.visible = true
      if (nearbySplinesRef.current) nearbySplinesRef.current.visible = false
      if (centerProjectPinRef.current) centerProjectPinRef.current.visible = true
      animateCameraTo([0, 180, 70], [0, 0, 0])
    }
  }

  // Compass North Reset
  const handleResetNorth = () => {
    if (!cameraRef.current || !controlsRef.current) return
    const curPos = cameraRef.current.position
    const target = controlsRef.current.target
    const radius = Math.sqrt(Math.pow(curPos.x - target.x, 2) + Math.pow(curPos.z - target.z, 2))
    animateCameraTo([target.x, curPos.y, target.z + radius], [target.x, target.y, target.z])
  }

  // Plot search
  const handleSearchPlot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const q = searchQuery.trim()
    const match = project.plots.find((p) => p.plotNumber === q)
    if (match) {
      setSelectedPlot(match)
      setActiveMode('plot-details')
      const [px, , pz] = match.position
      animateCameraTo([px + 14, 22, pz + 20], [px, 0, pz])
    } else {
      alert(`Plot #${q} not found. 9 open plots are currently available: 1309, 1301, 1245, 1246, 1247, 1253, 1284, 486, 698`)
    }
  }

  // Visual filter updates
  useEffect(() => {
    project.plots.forEach((p) => {
      const mesh = plotMeshesRef.current.get(p.id)
      const outline = plotOutlinesRef.current.get(p.id)
      const label = plotLabelsRef.current.get(p.id)
      if (!mesh || !outline || !label) return

      const isSelected = selectedPlot?.id === p.id
      const isHovered = hoveredPlot?.id === p.id
      const isAvailable = p.status === 'available'

      const matchesFilter = statusFilter === 'all' || p.status === statusFilter
      const mat = mesh.material as THREE.MeshStandardMaterial

      if (!matchesFilter) {
        mat.color.setHex(0x475569)
        mat.opacity = 0.15
        mat.transparent = true
        mesh.position.y = 0.1
        outline.visible = false
        label.visible = false
      } else {
        outline.visible = true
        label.visible = true

        if (isSelected) {
          mat.color.setHex(STATUS_COLORS.highlight)
          mat.transparent = false
          mat.opacity = 1.0
          mesh.position.y = 1.2
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + 1.8
        } else if (isHovered) {
          mat.color.setHex(isAvailable ? STATUS_HOVER_COLORS.available : STATUS_HOVER_COLORS.sold)
          mat.transparent = false
          mat.opacity = 1.0
          mesh.position.y = isAvailable ? 0.9 : 0.6
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + 1.6
        } else {
          mat.color.setHex(isAvailable ? STATUS_COLORS.available : STATUS_COLORS.sold)
          mat.transparent = !isAvailable
          mat.opacity = isAvailable ? 1.0 : 0.45
          mesh.position.y = p.position[1]
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + (isAvailable ? 2.5 : 1.2)
        }
      }
    })
  }, [project.plots, selectedPlot, hoveredPlot, statusFilter])

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none bg-[#0a1120] font-sans ${
        fullScreenPage
          ? 'fixed inset-0 w-screen h-screen z-50 rounded-none border-none'
          : isModal
          ? 'h-[92vh] rounded-2xl shadow-2xl border border-white/10'
          : 'h-[780px] md:h-[840px] rounded-2xl border border-white/10'
      }`}
    >
      {/* 3D WebGL Canvas (#stage) */}
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />

      {/* Cinematic Vignette Overlay matching MapX */}
      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(120%_95%_at_50%_45%,rgba(0,0,0,0)_52%,rgba(2,5,18,0.78)_100%)]" />

      {/* Loading Screen Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a1120] text-white">
          <div className="w-14 h-14 border-4 border-[#e9b95c]/20 border-t-[#e9b95c] rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-wider text-white">VIAN <span className="text-[#e9b95c]">VALLEY</span></h2>
          <p className="text-xs text-[#a9b6ca] mt-1 uppercase tracking-widest">Earthstay Plotted Township · Shabad</p>
          <div className="w-48 h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-[#e9b95c] animate-pulse w-3/4 rounded-full" />
          </div>
        </div>
      )}

      {/* TOPBAR (Exact MapX Layout & Typography) */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 md:h-16 px-3 md:px-6 bg-gradient-to-b from-[#0a1120]/95 via-[#0a1120]/75 to-transparent flex items-center justify-between pointer-events-none">
        {/* Logo Branding */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href={`/projects/${project.slug}`}
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#e9b95c]" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div>
            <div className="text-sm md:text-base font-extrabold tracking-wider text-white">
              VIAN <span className="text-[#e9b95c]">VALLEY</span>
            </div>
            <p className="text-[10px] md:text-[11px] text-[#a9b6ca] truncate max-w-[200px] sm:max-w-none">
              Premium Villa Plots · 160 Plots · Shabad, Hyderabad
            </p>
          </div>
        </div>

        {/* Center: Real-time Plot Counts & Search Input */}
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
          <button
            onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              statusFilter === 'available'
                ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Available <span className="font-black">{stats.available}</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'booked'
                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                : 'bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Booked <span className="font-black">{stats.booked}</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'sold'
                ? 'bg-red-500 text-white ring-2 ring-red-300'
                : 'bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Sold <span className="font-black">{stats.sold}</span>
          </button>

          {/* Plot Search Field */}
          <form onSubmit={handleSearchPlot} className="relative hidden sm:flex items-center">
            <input
              type="text"
              placeholder="Plot no."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-24 px-2.5 py-1 text-xs bg-[#0a1120]/90 border border-white/20 rounded-full text-white placeholder-slate-400 focus:outline-none focus:border-[#e9b95c]"
            />
            <button type="submit" className="absolute right-2 text-slate-400 hover:text-white cursor-pointer">
              <Search className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Right Action / Close button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors border border-white/15"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* TOP-LEFT FLOATING PROJECT CARD (MapX Image 1 Style) */}
      {activeMode === 'aerial' && (
        <button
          onClick={() => handleSwitchMode('project-details')}
          className="fixed top-20 left-4 z-20 flex items-center gap-3 p-3 rounded-2xl bg-[#0a1120]/90 border border-white/15 hover:border-[#e9b95c]/60 shadow-2xl backdrop-blur-xl cursor-pointer transition-all hover:scale-[1.02] text-left group pointer-events-auto"
        >
          <div className="w-13 h-13 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
            <img
              src="/images/projects/vian_valley_layout.png"
              alt="Vian Valley"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="pr-1">
            <span className="text-[10px] font-black tracking-wider text-[#e9b95c] uppercase block">
              Villa Plots For Sale
            </span>
            <h3 className="text-sm font-extrabold text-white leading-snug">Vian Valley</h3>
            <p className="text-[11px] text-[#a9b6ca]">Earthstay Township · 65+ Acres</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" />
        </button>
      )}

      {/* COMPASS NEEDLE (Exact MapX Bottom-Right `.compass` Reset to North) */}
      <button
        onClick={handleResetNorth}
        title="Reset to North"
        className="fixed bottom-9 right-4 z-20 w-11 h-11 rounded-full bg-[#0a1120]/85 border border-white/20 shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform backdrop-blur-md pointer-events-auto"
      >
        <svg
          viewBox="0 0 46 46"
          className="w-8 h-8 transition-transform duration-200"
          style={{ transform: `rotate(${-compassAngle}deg)` }}
        >
          <text x="23" y="9" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">N</text>
          <path d="M23 12 L27 23 L23 21 L19 23Z" fill="#e5484d" />
          <path d="M23 34 L27 23 L23 25 L19 23Z" fill="#fff" />
        </svg>
      </button>

      {/* RIGHT-HAND FLOATING NAVIGATION DOCK (`.scenes` exact MapX style) */}
      <nav className="fixed top-20 right-4 z-30 flex flex-col gap-1.5 w-48 sm:w-56 pointer-events-auto">
        <button
          onClick={() => handleSwitchMode('aerial')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
            activeMode === 'aerial'
              ? 'bg-[#0084ff] text-white ring-2 ring-white scale-[1.02] shadow-[#0084ff]/50'
              : 'bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">1</span>
          <span>Aerial 360° View</span>
        </button>

        <button
          onClick={() => handleSwitchMode('plot-details')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
            activeMode === 'plot-details'
              ? 'bg-[#10b981] text-white ring-2 ring-white scale-[1.02] shadow-[#10b981]/50'
              : 'bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">2</span>
          <span>Plot Details</span>
        </button>

        <button
          onClick={() => handleSwitchMode('project-details')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
            activeMode === 'project-details'
              ? 'bg-[#f59e0b] text-white ring-2 ring-white scale-[1.02] shadow-[#f59e0b]/50'
              : 'bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">3</span>
          <span>Project Details</span>
        </button>

        <button
          onClick={() => handleSwitchMode('nearby')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
            activeMode === 'nearby'
              ? 'bg-[#a855f7] text-white ring-2 ring-white scale-[1.02] shadow-[#a855f7]/50'
              : 'bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">4</span>
          <span>Nearby Locations</span>
        </button>

        <button
          onClick={() => handleSwitchMode('orr-rrr')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xl backdrop-blur-md ${
            activeMode === 'orr-rrr'
              ? 'bg-[#ec4899] text-white ring-2 ring-white scale-[1.02] shadow-[#ec4899]/50'
              : 'bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">5</span>
          <span>ORR &amp; RRR Corridor</span>
        </button>

        {/* 6 is skipped as requested */}

        <a
          href="https://maps.google.com/?q=Shabad,+Telangana"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2.5 bg-[#0a1120]/85 hover:bg-[#0a1120] text-white border border-white/15 transition-all cursor-pointer shadow-xl backdrop-blur-md"
        >
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-black">7</span>
          <span>View in Google Maps</span>
        </a>

        <a
          href={project.pdfLayoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white transition-all cursor-pointer shadow-xl backdrop-blur-md mt-1"
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Download Brochure</span>
        </a>

        <a
          href={project.pdfLayoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white transition-all cursor-pointer shadow-xl backdrop-blur-md"
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Download Master Plan</span>
        </a>
      </nav>

      {/* LEFT-SIDE ASIDE CARD: MODE 3 (PROJECT DETAILS - Exact MapX Image 2 Card Style) */}
      {activeMode === 'project-details' && (
        <aside className="fixed top-20 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-[#0a1120]/95 border border-white/15 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 pointer-events-auto">
          <div>
            <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-white/10">
              <img
                src="/images/projects/vian_valley_layout.png"
                alt="Vian Valley Entrance"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120] via-[#0a1120]/30 to-transparent" />
              <button
                onClick={() => setActiveMode('aerial')}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0a1120]/80 hover:bg-[#0a1120] text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-3">
                <h3 className="font-extrabold text-lg text-white">Vian Valley</h3>
                <p className="text-[11px] text-[#06b6d4]">Theegapur Road, Shabad – Southwest Hyderabad</p>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#a9b6ca] uppercase font-semibold block">Project Area</span>
                <span className="text-base font-black text-white">65+ acres</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#a9b6ca] uppercase font-semibold block">Villa Plots</span>
                <span className="text-base font-black text-white">160 plots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#a9b6ca] uppercase font-semibold block">Plot Sizes</span>
                <span className="text-base font-black text-[#e9b95c]">167 – 350+ <span className="text-xs font-normal text-slate-300">sq.yds</span></span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-[#a9b6ca] uppercase font-semibold block">Approvals</span>
                <span className="text-base font-black text-emerald-400">HMDA &amp; RERA</span>
              </div>
            </div>

            {/* PLOTS TODAY Section (Matching MapX Screenshot) */}
            <div className="mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#a9b6ca] block mb-1.5">Plots Today</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
                  className={`p-2 rounded-xl text-center border cursor-pointer ${
                    statusFilter === 'available' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.available}</span>
                  <span className="text-[10px] uppercase font-semibold">Available</span>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
                  className={`p-2 rounded-xl text-center border cursor-pointer ${
                    statusFilter === 'booked' ? 'bg-amber-500 text-white' : 'bg-white/5 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.booked}</span>
                  <span className="text-[10px] uppercase font-semibold">Booked</span>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
                  className={`p-2 rounded-xl text-center border cursor-pointer ${
                    statusFilter === 'sold' ? 'bg-red-500 text-white' : 'bg-white/5 text-red-300 border-red-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.sold}</span>
                  <span className="text-[10px] uppercase font-semibold">Sold</span>
                </button>
              </div>
              <p className="text-[10px] text-[#a9b6ca] mt-1.5 italic">
                Tap a plot on the map to see its size, sides, facing and status. Tap a box above to show only those plots.
              </p>
            </div>

            {/* Metadata Table */}
            <div className="space-y-1.5 text-xs bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-[#a9b6ca]">Project</span>
                <span className="font-semibold text-white">Vian Valley – Earthstay Villas</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-[#a9b6ca]">Location</span>
                <span className="font-semibold text-white">Shabad, Southwest Hyderabad</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-[#a9b6ca]">HMDA LP No.</span>
                <span className="font-semibold text-emerald-400">Clear Title Sanctioned</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-white/10">
                <span className="text-[#a9b6ca]">Registration</span>
                <span className="font-semibold text-white">Spot registration</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#a9b6ca]">Finance</span>
                <span className="font-semibold text-white">Bank loans available</span>
              </div>
            </div>
          </div>

          <a
            href="https://maps.google.com/?q=Shabad,+Telangana"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all mt-3 cursor-pointer shadow-lg"
          >
            <Navigation className="w-4 h-4" /> Get directions to the plot
          </a>
        </aside>
      )}

      {/* LEFT-SIDE ASIDE CARD: MODE 2 (PLOT DETAILS POPUP) */}
      {selectedPlot && (
        <aside className="fixed top-20 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-[#0a1120]/95 border border-cyan-500/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 pointer-events-auto">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Plot #{selectedPlot.plotNumber}
                  </h2>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedPlot.status === 'available'
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                        : selectedPlot.status === 'booked'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {selectedPlot.status}
                  </span>
                </div>
                <p className="text-xs text-[#a9b6ca] mt-0.5">{selectedPlot.sector} • {project.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-[#a9b6ca] uppercase tracking-wide block">Plot Area</span>
                <span className="text-lg font-black text-white block mt-0.5">{selectedPlot.areaSqYds} <span className="text-xs font-normal text-slate-300">Sq. Yds</span></span>
                <span className="text-[11px] text-[#a9b6ca]">({selectedPlot.areaSqFt} Sq. Ft.)</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-[#a9b6ca] uppercase tracking-wide block">Facing &amp; Vastu</span>
                <span className="text-lg font-black text-[#e9b95c] block mt-0.5">{selectedPlot.facing}</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 100% Vastu</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs bg-white/5 rounded-xl p-3.5 border border-white/10">
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-[#a9b6ca]">Dimensions</span>
                <span className="font-semibold text-white">{selectedPlot.dimensions}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-[#a9b6ca]">Road Width</span>
                <span className="font-semibold text-white">{selectedPlot.roadWidth}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/10">
                <span className="text-[#a9b6ca]">Category</span>
                <span className="font-semibold text-white">{selectedPlot.isCorner ? 'Premium Corner Plot' : 'Standard Residential Plot'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#a9b6ca]">Pricing</span>
                <span className="font-semibold text-[#e9b95c]">Available on Request</span>
              </div>
            </div>

            <div className="mt-4 bg-white/5 border border-cyan-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>HMDA &amp; RERA Sanctioned Boundary</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Clear title, spot registration eligible with full boundary demarcation.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {selectedPlot.status === 'available' ? (
              <a
                href={`/projects/${project.slug}#book-visit`}
                className="w-full py-3 px-4 rounded-xl bg-[#e9b95c] hover:bg-[#d4a34b] text-[#1c1405] font-extrabold text-sm text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Request Quote for Plot #{selectedPlot.plotNumber}
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 text-center text-xs text-slate-300 border border-white/10">
                Plot #{selectedPlot.plotNumber} is <span className="font-bold text-red-400 uppercase">{selectedPlot.status}</span>. Only 9 open plots are currently available: <span className="text-emerald-400 font-bold">1309, 1301, 1245, 1246, 1247, 1253, 1284, 486, 698</span>.
              </div>
            )}

            <a
              href={`https://wa.me/919666504405?text=${encodeURIComponent(
                `Hi Bhuwanta, I am viewing the 3D Layout of ${project.projectName} and inquiring about Plot #${selectedPlot.plotNumber} (${selectedPlot.areaSqYds} Sq. Yds, ${selectedPlot.facing} Facing, Status: ${selectedPlot.status}). Please share details.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs sm:text-sm text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Phone className="w-4 h-4" /> Chat on WhatsApp for Plot #{selectedPlot.plotNumber}
            </a>
          </div>
        </aside>
      )}

      {/* LEFT-SIDE ASIDE CARD: MODE 4 (NEARBY LOCATIONS - MapX Image 3 Style) */}
      {activeMode === 'nearby' && (
        <aside className="fixed top-20 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-[#0a1120]/95 border border-purple-500/40 shadow-2xl rounded-2xl p-4 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 pointer-events-auto">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-purple-400" /> Nearby Growth Corridors
              </h3>
              <button onClick={() => setActiveMode('aerial')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#a9b6ca] mt-1 mb-3">
              Tap any destination to swing the 3D camera along that highway corridor:
            </p>
            <div className="space-y-2">
              {project.landmarks.map((lm) => (
                <div
                  key={lm.id}
                  onClick={() => {
                    setSelectedLandmark(lm)
                    const [lx, , lz] = lm.position
                    animateCameraTo([lx * 0.7, 40, lz * 0.7 + 40], [lx, 0, lz])
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                    selectedLandmark?.id === lm.id
                      ? 'bg-purple-950/80 border-purple-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">{lm.name}</h4>
                    <p className="text-[11px] text-[#a9b6ca] mt-0.5">{lm.subtitle}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                      Direction: {lm.direction}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-emerald-400 block">{lm.travelTime}</span>
                    <span className="text-[10px] text-[#a9b6ca]">{lm.distance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* LEFT-SIDE ASIDE CARD: MODE 5 (ORR & RRR - MapX Image 4 Style) */}
      {activeMode === 'orr-rrr' && (
        <aside className="fixed top-20 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-[#0a1120]/95 border border-pink-500/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 pointer-events-auto">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-pink-400" /> Strategic ORR &amp; RRR Alignment
              </h3>
              <button onClick={() => setActiveMode('aerial')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-400/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase">Outer Ring Road (ORR)</span>
                  <span className="text-xs font-black text-cyan-200">18.7 KM</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Connects to Gachibowli, Financial District and RGIA Airport in 25–35 minutes via the 300 Ft Master Plan Road.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-950/60 border border-orange-400/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-300 uppercase">Regional Ring Road (RRR)</span>
                  <span className="text-xs font-black text-orange-200">25.4 KM</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Upcoming 340 KM expressway transforming Southwest Hyderabad into the state&apos;s premier logistics &amp; tech hub.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-bold text-white block">Why Invest in this Corridor?</span>
                <p className="text-[11px] text-[#a9b6ca] mt-1 leading-relaxed">
                  Vian Valley sits directly between ORR and RRR in Shabad—poised for exponential commercial growth adjacent to the Chandanvelly SEZ (Amazon &amp; Welspun).
                </p>
              </div>
            </div>
          </div>

          <a
            href={`/projects/${project.slug}#book-visit`}
            className="w-full py-3 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs text-center flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Book a Site Visit to Vian Valley
          </a>
        </aside>
      )}

      {/* FOOTER ATTRIBUTION (Exact MapX `#attr`) */}
      <div className="fixed bottom-2 right-3 z-20 text-[8px] md:text-[9px] text-white/50 tracking-wider pointer-events-none bg-[#0a1120]/60 px-2 py-0.5 rounded backdrop-blur-sm">
        Imagery © Esri, Maxar, Earthstar Geographics · Roads © OpenStreetMap
      </div>

      {/* FLOATING HOVER TOOLTIP */}
      {hoveredPlot && tooltipPos && !selectedPlot && (
        <div
          className="fixed pointer-events-none z-40 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-[#0a1120]/95 border border-cyan-400/60 text-white shadow-xl backdrop-blur-md"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-cyan-300">Plot #{hoveredPlot.plotNumber}</span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                hoveredPlot.status === 'available'
                  ? 'bg-emerald-500 text-white'
                  : hoveredPlot.status === 'booked'
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {hoveredPlot.status}
            </span>
          </div>
          <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <span>{hoveredPlot.areaSqYds} Sq. Yds</span>
            <span>•</span>
            <span>{hoveredPlot.facing} Facing</span>
          </div>
        </div>
      )}
    </div>
  )
}
