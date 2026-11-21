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
  Maximize2,
  Minimize2,
  Compass,
  MapPin,
  CheckCircle2,
  Phone,
  FileText,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  RotateCw,
  Navigation,
  Download,
} from 'lucide-react'
import Link from 'next/link'

// Strict Status Colors: Available: Green, Booked: Yellow, Sold: Red
const STATUS_COLORS = {
  available: 0x10b981, // Emerald Green
  booked: 0xf59e0b,    // Amber Yellow
  sold: 0xef4444,      // Crimson Red
  highlight: 0xfbbf24, // Radiant Amber Gold
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [isEveningMode, setIsEveningMode] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
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

  // Summaries
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
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Plot ${text}`, 80, 35)
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
        ctx.roundRect(6, 6, 148, 58, 12)
        ctx.fill()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
        ctx.lineWidth = 2
        ctx.roundRect(6, 6, 148, 58, 12)
        ctx.stroke()
        ctx.font = 'bold 26px sans-serif'
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

  // Create Central Floating 3D Beacon for the Project
  const createProjectCenterBeacon = (name: string, subtitle: string) => {
    const group = new THREE.Group()

    // 1. Stem line
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.2, 16, 8)
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 })
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 8
    group.add(stem)

    // 2. Base ground pulsing ring
    const ringGeo = new THREE.RingGeometry(2.5, 4.5, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.2
    group.add(ring)

    // 3. Floating Badge Card (Image 1 style)
    const canvas = document.createElement('canvas')
    canvas.width = 440
    canvas.height = 140
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Glow border
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
      ctx.roundRect(8, 8, 424, 124, 28)
      ctx.fill()
      ctx.strokeStyle = '#06b6d4'
      ctx.lineWidth = 4
      ctx.roundRect(8, 8, 424, 124, 28)
      ctx.stroke()

      // Inner emblem circle
      ctx.fillStyle = '#0e7490'
      ctx.beginPath()
      ctx.arc(60, 70, 36, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = 'bold 24px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('BV', 60, 70)

      // Project title & Subtitle
      ctx.textAlign = 'left'
      ctx.font = '900 32px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(name.toUpperCase(), 115, 54)

      // Pill for details
      ctx.fillStyle = '#0891b2'
      ctx.roundRect(115, 78, 280, 34, 17)
      ctx.fill()
      ctx.font = 'bold 16px sans-serif'
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

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1d)
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0022)
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

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.08
    controls.minDistance = 15
    controls.maxDistance = 320
    controls.target.set(35, 0, 5)
    controlsRef.current = controls

    // 5. Lighting
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

    // Subtle table foundation
    const foundationGeo = new THREE.BoxGeometry(250, 3, 250)
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    const foundation = new THREE.Mesh(foundationGeo, foundationMat)
    foundation.position.set(0, -1.6, 0)
    scene.add(foundation)

    // 7. Central Floating Project Beacon (Image 1 style)
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

    // 9. Nearby Landmarks & Glowing Highway Route Splines (Image 3 style)
    const nearbyGroup = new THREE.Group()
    const splinesGroup = new THREE.Group()

    const beaconGeo = new THREE.OctahedronGeometry(1.8, 0)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Vibrant purple beacon
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.6,
    })

    project.landmarks.forEach((lm) => {
      const [lx, ly, lz] = lm.position
      const beacon = new THREE.Mesh(beaconGeo, beaconMat.clone())
      beacon.position.set(lx, ly, lz)
      beacon.userData = { landmarkId: lm.id, landmarkData: lm }

      const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, ly, 6)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.7 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(lx, ly / 2, lz)

      const ringGeo = new THREE.RingGeometry(1.6, 2.8, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(lx, 0.1, lz)

      // Landmark Billboard Label
      const canvas = document.createElement('canvas')
      canvas.width = 280
      canvas.height = 76
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(24, 18, 48, 0.94)'
        ctx.roundRect(4, 4, 272, 68, 16)
        ctx.fill()
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 3
        ctx.roundRect(4, 4, 272, 68, 16)
        ctx.stroke()
        ctx.font = 'bold 23px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(lm.name, 140, 28)
        ctx.font = 'bold 18px sans-serif'
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

      // Glowing curved 3D highway line connecting Vian Valley to landmark (Image 3 style)
      const projectOrigin = new THREE.Vector3(45, 0.2, 8)
      const landmarkTarget = new THREE.Vector3(lx, 0.2, lz)
      const midPoint = new THREE.Vector3(
        (projectOrigin.x + landmarkTarget.x) / 2 + (Math.random() - 0.5) * 10,
        1.5,
        (projectOrigin.z + landmarkTarget.z) / 2 + (Math.random() - 0.5) * 10
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

    // 10. ORR & RRR Macro Rings Mode (Image 4 style)
    const orrGroup = new THREE.Group()
    orrGroup.visible = false

    // Inner ORR Ring (Cyan)
    const orrRadius = 45
    const orrCurve = new THREE.EllipseCurve(0, 0, orrRadius * 1.1, orrRadius, 0, 2 * Math.PI, false, 0)
    const orrPoints = orrCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, 0.4, p.y))
    const orrGeo = new THREE.BufferGeometry().setFromPoints(orrPoints)
    const orrMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 4 })
    const orrLine = new THREE.Line(orrGeo, orrMat)
    orrGroup.add(orrLine)

    // Outer RRR Ring (Orange)
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

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Handle camera smooth transitions
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

      // Pulse beacon rings
      beaconRingsRef.current.forEach((ring) => {
        const scale = 1 + Math.sin(time * 3) * 0.12
        ring.scale.set(scale, scale, 1)
      })

      controls.autoRotate = isAutoRotate
      controls.autoRotateSpeed = 1.2
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
  }, [project, animateCameraTo, initialPlotId, isAutoRotate])

  // Lighting Mode (Day / Evening)
  useEffect(() => {
    if (!directionalLightRef.current || !ambientLightRef.current || !sceneRef.current) return
    if (isEveningMode) {
      // Golden Hour / Twilight
      sceneRef.current.background = new THREE.Color(0x1a0f28)
      sceneRef.current.fog = new THREE.FogExp2(0x1a0f28, 0.0025)
      directionalLightRef.current.color.setHex(0xf97316)
      directionalLightRef.current.intensity = 1.1
      ambientLightRef.current.color.setHex(0xc084fc)
      ambientLightRef.current.intensity = 0.65
    } else {
      // Crisp Daylight
      sceneRef.current.background = new THREE.Color(0x0a0f1d)
      sceneRef.current.fog = new THREE.FogExp2(0x0a0f1d, 0.0022)
      directionalLightRef.current.color.setHex(0xfffbeb)
      directionalLightRef.current.intensity = 1.4
      ambientLightRef.current.color.setHex(0xffffff)
      ambientLightRef.current.intensity = 0.95
    }
  }, [isEveningMode])

  // Mode Transition Handler (Switching between the 5 view modes)
  const handleSwitchMode = (mode: ViewerMode) => {
    setActiveMode(mode)

    const textureLoader = new THREE.TextureLoader()

    if (mode === 'aerial') {
      // Mode 1: Aerial 360 View
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
      // Mode 2: Plot Details (Zoom into plots)
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
      // Mode 3: Project Details (Overhead isometric angle with left drawer)
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
      // Mode 4: Nearby Locations (Wide view with glowing road ribbons)
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
      // Mode 5: ORR & RRR Macro Regional Map
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

  // Handle Plot Search
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
      alert(`Plot #${q} not found. Available open plots: 1309, 1301, 1245, 1246, 1247, 1253, 1284, 486, 698`)
    }
  }

  // Filter Updates
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

  // Fullscreen toggle
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
      className={`relative w-full overflow-hidden select-none bg-slate-950 font-sans ${
        fullScreenPage
          ? 'fixed inset-0 w-screen h-screen z-50 rounded-none border-none'
          : isModal
          ? 'h-[92vh] rounded-2xl shadow-2xl border border-brand-border/40'
          : 'h-[780px] md:h-[840px] rounded-2xl border border-brand-border'
      }`}
    >
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-white">
          <div className="w-12 h-12 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">Loading Aerial 360° Digital Twin...</p>
          <p className="text-xs text-slate-400 mt-1">Streaming satellite orthomosaic &amp; live plot coordinates</p>
        </div>
      )}

      {/* TOP STATUS HUD BAR (Matching User Reference Image 1 & 2) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 md:p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/75 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-auto">
          {/* Left: Project Branding & Back to Project */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/projects/${project.slug}`}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Back</span>
            </Link>

            <div>
              <h1 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                {project.projectName.toUpperCase()}
              </h1>
              <p className="text-[11px] text-slate-300">
                Premium Villa Plots • {project.location}
              </p>
            </div>
          </div>

          {/* Center: Inventory Counts & Plot Search */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'available'
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/30'
                  : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available <span className="font-bold">{stats.available}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'booked'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                  : 'bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Booked <span className="font-bold">{stats.booked}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === 'sold'
                  ? 'bg-red-500 text-white ring-2 ring-red-300'
                  : 'bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Sold <span className="font-bold">{stats.sold}</span>
            </button>

            {/* Instant Plot No. Search Form */}
            <form onSubmit={handleSearchPlot} className="relative flex items-center">
              <input
                type="text"
                placeholder="Plot no."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-24 px-2.5 py-1 text-xs bg-slate-900/90 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
              <button type="submit" className="absolute right-1 text-slate-400 hover:text-white">
                <Search className="w-3 h-3" />
              </button>
            </form>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              title="Auto Rotate 360"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                isAutoRotate ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              <RotateCw className={`w-3 h-3 ${isAutoRotate ? 'animate-spin' : ''}`} />
              <span>Auto</span>
            </button>
            <button
              onClick={() => setIsMusicPlaying(!isMusicPlaying)}
              title="Music"
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {isMusicPlaying ? <Volume2 className="w-3 h-3 text-cyan-400" /> : <VolumeX className="w-3 h-3 text-slate-400" />}
              <span>{isMusicPlaying ? 'Music On' : 'Music Off'}</span>
            </button>
            <button
              onClick={() => setIsEveningMode(!isEveningMode)}
              title="Time of Day"
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {isEveningMode ? <Moon className="w-3 h-3 text-amber-400" /> : <Sun className="w-3 h-3 text-amber-300" />}
              <span>{isEveningMode ? 'Evening' : 'Morning'}</span>
            </button>
            <a
              href="https://maps.google.com/?q=Shabad,+Telangana"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span>Directions</span>
            </a>
            <button
              onClick={handleToggleFullscreen}
              className="w-7 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT-HAND FLOATING NAVIGATION DOCK (Exact match for User Reference Images 1, 2, 3, 4) */}
      <div className="absolute top-24 right-4 z-30 flex flex-col gap-1.5 w-48 sm:w-56 pointer-events-auto">
        <button
          onClick={() => handleSwitchMode('aerial')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md ${
            activeMode === 'aerial'
              ? 'bg-[#0084ff] text-white ring-2 ring-blue-300 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
          <span>Aerial 360° View</span>
        </button>

        <button
          onClick={() => handleSwitchMode('plot-details')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md ${
            activeMode === 'plot-details'
              ? 'bg-[#10b981] text-white ring-2 ring-emerald-300 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">2</span>
          <span>Plot Details</span>
        </button>

        <button
          onClick={() => handleSwitchMode('project-details')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md ${
            activeMode === 'project-details'
              ? 'bg-[#f59e0b] text-white ring-2 ring-amber-300 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</span>
          <span>Project Details</span>
        </button>

        <button
          onClick={() => handleSwitchMode('nearby')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md ${
            activeMode === 'nearby'
              ? 'bg-[#a855f7] text-white ring-2 ring-purple-300 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">4</span>
          <span>Nearby Locations</span>
        </button>

        <button
          onClick={() => handleSwitchMode('orr-rrr')}
          className={`w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 transition-all cursor-pointer shadow-lg backdrop-blur-md ${
            activeMode === 'orr-rrr'
              ? 'bg-[#ec4899] text-white ring-2 ring-pink-300 scale-[1.02]'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">5</span>
          <span>ORR &amp; RRR Corridor</span>
        </button>

        {/* 6 is skipped as requested */}

        <a
          href="https://maps.google.com/?q=Shabad,+Telangana"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-lg backdrop-blur-md"
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">7</span>
          <span>View in Google Maps</span>
        </a>

        <a
          href={project.pdfLayoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white transition-all cursor-pointer shadow-lg backdrop-blur-md mt-1"
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Download Brochure</span>
        </a>

        <a
          href={project.pdfLayoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-3 rounded-full text-xs font-bold text-left flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white transition-all cursor-pointer shadow-lg backdrop-blur-md"
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Download Master Plan</span>
        </a>
      </div>

      {/* LEFT-SIDE CONTEXT DRAWER: MODE 3 (PROJECT DETAILS - Image 2 Style) */}
      {activeMode === 'project-details' && (
        <div className="absolute top-24 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-slate-900/95 border border-cyan-500/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 border border-slate-700">
              <img
                src="/images/projects/vian_valley_layout.png"
                alt="Vian Valley Entrance"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <button
                onClick={() => setActiveMode('aerial')}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-3">
                <h3 className="font-black text-lg text-white">Vian Valley</h3>
                <p className="text-[11px] text-cyan-300">Shabad – Southwest Hyderabad</p>
              </div>
            </div>

            {/* Quick Metrics Grid (Image 2 style) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Project Area</span>
                <span className="text-base font-black text-white">65+ acres</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Villa Plots</span>
                <span className="text-base font-black text-white">160 plots</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plot Sizes</span>
                <span className="text-base font-black text-amber-400">167 – 350+ <span className="text-xs font-normal text-slate-300">sq.yds</span></span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Approvals</span>
                <span className="text-base font-black text-emerald-400">HMDA &amp; RERA</span>
              </div>
            </div>

            {/* PLOTS TODAY Section (Image 2 style) */}
            <div className="mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Plots Today</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
                  className={`p-2 rounded-lg text-center border cursor-pointer ${
                    statusFilter === 'available' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.available}</span>
                  <span className="text-[10px] uppercase font-semibold">Available</span>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
                  className={`p-2 rounded-lg text-center border cursor-pointer ${
                    statusFilter === 'booked' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.booked}</span>
                  <span className="text-[10px] uppercase font-semibold">Booked</span>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
                  className={`p-2 rounded-lg text-center border cursor-pointer ${
                    statusFilter === 'sold' ? 'bg-red-500 text-white' : 'bg-slate-800 text-red-300 border-red-500/40'
                  }`}
                >
                  <span className="text-base font-black block">{stats.sold}</span>
                  <span className="text-[10px] uppercase font-semibold">Sold</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Tap a plot on the map to see its size, sides, facing and status.
              </p>
            </div>

            {/* Metadata Table */}
            <div className="space-y-1.5 text-xs bg-slate-800/50 rounded-xl p-3 border border-slate-700/80">
              <div className="flex justify-between py-0.5 border-b border-slate-700/60">
                <span className="text-slate-400">Project</span>
                <span className="font-semibold text-white">Vian Valley Township</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-700/60">
                <span className="text-slate-400">Location</span>
                <span className="font-semibold text-white">Shabad, Southwest Hyderabad</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-700/60">
                <span className="text-slate-400">Approvals</span>
                <span className="font-semibold text-emerald-400">HMDA &amp; TS RERA Registered</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-700/60">
                <span className="text-slate-400">Registration</span>
                <span className="font-semibold text-white">Spot registration eligible</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Finance</span>
                <span className="font-semibold text-white">Bank loan assistance</span>
              </div>
            </div>
          </div>

          <a
            href="https://maps.google.com/?q=Shabad,+Telangana"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1.5 transition-all mt-3"
          >
            <Navigation className="w-4 h-4" /> Get directions to the plot
          </a>
        </div>
      )}

      {/* LEFT-SIDE CONTEXT DRAWER: MODE 2 (PLOT DETAILS) */}
      {selectedPlot && (
        <div className="absolute top-24 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-slate-900/95 border border-cyan-500/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
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
                <p className="text-xs text-slate-400 mt-0.5">{selectedPlot.sector} • {project.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Plot Area</span>
                <span className="text-lg font-bold text-white block mt-0.5">{selectedPlot.areaSqYds} <span className="text-xs font-normal text-slate-300">Sq. Yds</span></span>
                <span className="text-[11px] text-slate-400">({selectedPlot.areaSqFt} Sq. Ft.)</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Facing &amp; Vastu</span>
                <span className="text-lg font-bold text-amber-400 block mt-0.5">{selectedPlot.facing}</span>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 100% Vastu</span>
              </div>
            </div>

            {/* Spec List */}
            <div className="mt-4 space-y-2 text-xs bg-slate-800/50 rounded-xl p-3.5 border border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Dimensions</span>
                <span className="font-semibold text-white">{selectedPlot.dimensions}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Road Width</span>
                <span className="font-semibold text-white">{selectedPlot.roadWidth}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Category</span>
                <span className="font-semibold text-white">{selectedPlot.isCorner ? 'Premium Corner Plot' : 'Standard Residential Plot'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Pricing</span>
                <span className="font-semibold text-amber-400">Available on Request</span>
              </div>
            </div>

            <div className="mt-4 bg-slate-800/60 border border-cyan-500/30 rounded-xl p-3">
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
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm text-center flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Request Quote for Plot #{selectedPlot.plotNumber}
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-slate-800 text-center text-xs text-slate-300 border border-slate-700">
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
        </div>
      )}

      {/* LEFT-SIDE CONTEXT DRAWER: MODE 4 (NEARBY LOCATIONS - Image 3 Style) */}
      {activeMode === 'nearby' && (
        <div className="absolute top-24 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-slate-900/95 border border-purple-500/40 shadow-2xl rounded-2xl p-4 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" /> Nearby Growth Corridors
              </h3>
              <button onClick={() => setActiveMode('aerial')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Tap any destination to swing the camera towards that highway corridor:
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
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">{lm.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{lm.subtitle}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
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
        </div>
      )}

      {/* LEFT-SIDE CONTEXT DRAWER: MODE 5 (ORR & RRR - Image 4 Style) */}
      {activeMode === 'orr-rrr' && (
        <div className="absolute top-24 left-4 bottom-6 z-30 w-[92%] sm:w-[380px] bg-slate-900/95 border border-pink-500/40 shadow-2xl rounded-2xl p-5 backdrop-blur-xl text-white flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-pink-400" /> Strategic ORR &amp; RRR Alignment
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

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-white block">Why Invest in this Corridor?</span>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Vian Valley sits directly between ORR and RRR in Shabad—poised for exponential commercial growth adjacent to the Chandanvelly SEZ (Amazon &amp; Welspun).
                </p>
              </div>
            </div>
          </div>

          <a
            href={`/projects/${project.slug}#book-visit`}
            className="w-full py-3 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs text-center flex items-center justify-center gap-2 transition-all mt-4"
          >
            <Sparkles className="w-4 h-4" /> Book a Site Visit to Vian Valley
          </a>
        </div>
      )}

      {/* FLOATING HOVER TOOLTIP */}
      {hoveredPlot && tooltipPos && !selectedPlot && (
        <div
          className="fixed pointer-events-none z-40 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-slate-900/95 border border-cyan-400/60 text-white shadow-xl backdrop-blur-md"
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
