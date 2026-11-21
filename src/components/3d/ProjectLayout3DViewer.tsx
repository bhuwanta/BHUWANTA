'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Project3DData,
  Plot3D,
  PlotStatus,
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
  Eye,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Navigation,
} from 'lucide-react'
import Link from 'next/link'

// Strict Status Colors requested by user:
// Available: Green, Booked: Yellow, Sold: Red
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
  const [activeTab, setActiveTab] = useState<'layout' | 'landmarks'>('layout')
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark3D | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'sold'>('all')
  const [sectorFilter, setSectorFilter] = useState<'all' | PlotSector>('all')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [is2DMode, setIs2DMode] = useState(false)
  const [loading, setLoading] = useState(true)

  // References for Three.js engine
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const plotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const plotOutlinesRef = useRef<Map<string, THREE.LineSegments>>(new Map())
  const plotLabelsRef = useRef<Map<string, THREE.Sprite>>(new Map())
  const beaconRingsRef = useRef<THREE.Mesh[]>([])
  const animFrameId = useRef<number | null>(null)
  const cameraTransition = useRef<{
    startPos: THREE.Vector3
    endPos: THREE.Vector3
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    progress: number
    active: boolean
  } | null>(null)

  // Count summaries (strictly Available, Booked, Sold - No mortgage)
  const stats = useMemo(() => {
    const total = project.plots.length
    const available = project.plots.filter((p) => p.status === 'available').length
    const booked = project.plots.filter((p) => p.status === 'booked').length
    const sold = project.plots.filter((p) => p.status === 'sold').length
    return { total, available, booked, sold }
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

  // Create canvas texture for plot billboard sprite
  const createTextSprite = (text: string, isAvailable: boolean) => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 72
    const ctx = canvas.getContext('2d')
    if (ctx) {
      if (isAvailable) {
        // High-visibility glowing green pill for available plots
        ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'
        ctx.roundRect(4, 4, 152, 64, 16)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.roundRect(4, 4, 152, 64, 16)
        ctx.stroke()
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Plot ${text}`, 80, 36)
      } else {
        // Subtle dark translucent pill for sold plots
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
        ctx.roundRect(6, 6, 148, 60, 12)
        ctx.fill()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
        ctx.lineWidth = 2
        ctx.roundRect(6, 6, 148, 60, 12)
        ctx.stroke()
        ctx.font = 'bold 26px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#f87171'
        ctx.fillText(text, 80, 36)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(isAvailable ? 4.8 : 3.2, isAvailable ? 2.2 : 1.5, 1)
    return sprite
  }

  // Initialize Three.js Scene with Authentic High-Fidelity Textured Masterplan
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    // 1. Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a) // Deep slate architectural background
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0028)
    sceneRef.current = scene

    // 2. Camera setup
    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 1200)
    camera.position.set(25, 115, 125)
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
    renderer.toneMappingExposure = 1.18
    rendererRef.current = renderer

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 15
    controls.maxDistance = 280
    controls.target.set(10, 0, 5)
    controlsRef.current = controls

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35)
    sunLight.position.set(70, 130, 60)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 400
    const d = 130
    sunLight.shadow.camera.left = -d
    sunLight.shadow.camera.right = d
    sunLight.shadow.camera.top = d
    sunLight.shadow.camera.bottom = -d
    sunLight.shadow.bias = -0.0004
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.45)
    fillLight.position.set(-80, 60, -60)
    scene.add(fillLight)

    // 6. Base Foundation / Tabletop Platform
    const tableTopGeo = new THREE.BoxGeometry(185, 2.5, 255)
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.2,
    })
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat)
    tableTop.position.set(0, -1.3, 0)
    tableTop.receiveShadow = true
    scene.add(tableTop)

    // Glowing border outline around the masterplan model
    const tableBorderGeo = new THREE.EdgesGeometry(tableTopGeo)
    const tableBorderMat = new THREE.LineBasicMaterial({ color: 0xc4a55a, linewidth: 2 })
    const tableBorder = new THREE.LineSegments(tableBorderGeo, tableBorderMat)
    tableBorder.position.copy(tableTop.position)
    scene.add(tableBorder)

    // 7. HIGH-RESOLUTION AUTHENTIC MASTERPLAN TEXTURE
    // Image aspect ratio: 1385 px width x 1940 px height = 171.34 width x 240 height
    const textureLoader = new THREE.TextureLoader()
    const masterplanTex = textureLoader.load('/images/projects/vian_valley_layout.png', () => {
      setLoading(false)
    })
    masterplanTex.colorSpace = THREE.SRGBColorSpace
    masterplanTex.generateMipmaps = true
    masterplanTex.minFilter = THREE.LinearMipmapLinearFilter
    masterplanTex.magFilter = THREE.LinearFilter
    masterplanTex.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const blueprintGeo = new THREE.PlaneGeometry(171.34, 240)
    const blueprintMat = new THREE.MeshStandardMaterial({
      map: masterplanTex,
      roughness: 0.65,
      metalness: 0.05,
    })
    const blueprintMesh = new THREE.Mesh(blueprintGeo, blueprintMat)
    blueprintMesh.rotation.x = -Math.PI / 2
    blueprintMesh.position.set(0, 0.02, 0)
    blueprintMesh.receiveShadow = true
    scene.add(blueprintMesh)

    // 8. 3D INTERACTIVE PLOTS
    plotMeshesRef.current.clear()
    plotOutlinesRef.current.clear()
    plotLabelsRef.current.clear()
    beaconRingsRef.current = []

    const plotGroup = new THREE.Group()

    project.plots.forEach((p) => {
      const [w, h, d] = p.size
      const [px, py, pz] = p.position
      const isAvailable = p.status === 'available'

      // Elevated 3D plot prism
      const plotGeo = new THREE.BoxGeometry(w, h, d)
      const baseColor = isAvailable ? STATUS_COLORS.available : STATUS_COLORS.sold
      const plotMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: isAvailable ? 0.3 : 0.6,
        metalness: isAvailable ? 0.2 : 0.05,
        transparent: !isAvailable,
        opacity: isAvailable ? 1.0 : 0.42,
        emissive: isAvailable ? 0x059669 : 0x000000,
        emissiveIntensity: isAvailable ? 0.4 : 0,
      })

      const mesh = new THREE.Mesh(plotGeo, plotMat)
      mesh.position.set(px, py, pz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { plotId: p.id, plotData: p }

      // Blueprint edge outline
      const edgeGeo = new THREE.EdgesGeometry(plotGeo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: isAvailable ? 0xffffff : 0xef4444,
        linewidth: isAvailable ? 2 : 1,
        transparent: true,
        opacity: isAvailable ? 0.95 : 0.45,
      })
      const outline = new THREE.LineSegments(edgeGeo, edgeMat)
      outline.position.copy(mesh.position)

      // Billboard Sprite for Plot Number
      const sprite = createTextSprite(p.plotNumber, isAvailable)
      sprite.position.set(px, py + (isAvailable ? 2.4 : 1.2), pz)

      // For available plots: add animated beacon ring on ground
      if (isAvailable) {
        const ringGeo = new THREE.RingGeometry(Math.max(w, d) * 0.6, Math.max(w, d) * 0.9, 24)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.set(px, 0.05, pz)
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

    // 9. 3D LANDMARK BEACONS (Connectivity & Nearby Hubs)
    const landmarkGroup = new THREE.Group()
    const beaconGeo = new THREE.OctahedronGeometry(1.8, 0)
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
      const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, ly, 6)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7 })
      const stem = new THREE.Mesh(stemGeo, stemMat)
      stem.position.set(lx, ly / 2, lz)

      // Pulsing Ring on Ground
      const ringGeo = new THREE.RingGeometry(1.6, 2.6, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(lx, 0.08, lz)

      // Landmark Name Billboard
      const canvas = document.createElement('canvas')
      canvas.width = 240
      canvas.height = 70
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(2, 132, 199, 0.92)'
        ctx.roundRect(4, 4, 232, 62, 14)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.5
        ctx.roundRect(4, 4, 232, 62, 14)
        ctx.stroke()
        ctx.font = 'bold 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(lm.name, 120, 26)
        ctx.font = 'bold 18px sans-serif'
        ctx.fillStyle = '#fef08a'
        ctx.fillText(`${lm.travelTime} • ${lm.distance}`, 120, 48)
      }
      const labelTex = new THREE.CanvasTexture(canvas)
      const labelSpriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
      const labelSprite = new THREE.Sprite(labelSpriteMat)
      labelSprite.position.set(lx, ly + 2.6, lz)
      labelSprite.scale.set(6.8, 2.8, 1)

      landmarkGroup.add(beacon)
      landmarkGroup.add(stem)
      landmarkGroup.add(ring)
      landmarkGroup.add(labelSprite)
    })

    scene.add(landmarkGroup)

    // 10. Raycasting for Hover & Selection
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
        animateCameraTo([px + 14, 22, pz + 20], [px, 0, pz])
      }
    }

    canvas.addEventListener('mousemove', onPointerMove)
    canvas.addEventListener('mousedown', onPointerDown)
    canvas.addEventListener('mouseup', onPointerUp)

    // 11. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 12. Animation Loop
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
          const t = ct.progress < 0.5 ? 4 * ct.progress * ct.progress * ct.progress : 1 - Math.pow(-2 * ct.progress + 2, 3) / 2
          camera.position.lerpVectors(ct.startPos, ct.endPos, t)
          controls.target.lerpVectors(ct.startTarget, ct.endTarget, t)
        }
      }

      // Pulse beacon rings for available plots
      beaconRingsRef.current.forEach((ring) => {
        const scale = 1 + Math.sin(time * 3) * 0.12
        ring.scale.set(scale, scale, 1)
      })

      // Gentle floating animation on landmark beacons
      beaconMat.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.25

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Initial plot selection if requested
    if (initialPlotId) {
      const match = project.plots.find((p) => p.id === initialPlotId)
      if (match) {
        setSelectedPlot(match)
        const [px, , pz] = match.position
        animateCameraTo([px + 14, 22, pz + 20], [px, 0, pz])
      }
    }

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
      const isAvailable = p.status === 'available'

      const matchesFilter =
        (statusFilter === 'all' || p.status === statusFilter) &&
        (sectorFilter === 'all' || p.sector === sectorFilter)

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
          mat.opacity = isAvailable ? 1.0 : 0.42
          mesh.position.y = p.position[1]
          outline.position.y = mesh.position.y
          label.position.y = mesh.position.y + (isAvailable ? 2.4 : 1.2)
        }
      }
    })
  }, [project.plots, selectedPlot, hoveredPlot, statusFilter, sectorFilter])

  // Handle Sector Camera Jumps
  const handleJumpToSector = (sectorId: string) => {
    const sec = project.sectors.find((s) => s.id === sectorId)
    if (!sec) return
    animateCameraTo(sec.cameraPosition, sec.target)
  }

  // Toggle 2D / 3D camera
  const handleToggle2D = () => {
    if (!is2DMode) {
      animateCameraTo([0, 160, 0], [0, 0, 0]) // True architectural top-down blueprint view
      setIs2DMode(true)
    } else {
      animateCameraTo([25, 115, 125], [10, 0, 5]) // Standard isometric 3D view
      setIs2DMode(false)
    }
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
      className={`relative w-full overflow-hidden select-none bg-slate-950 font-sans ${
        fullScreenPage
          ? 'fixed inset-0 w-screen h-screen z-50 rounded-none border-none'
          : isModal
          ? 'h-[90vh] rounded-2xl shadow-2xl border border-brand-border/40'
          : 'h-[750px] md:h-[820px] rounded-2xl border border-brand-border'
      }`}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-white">
          <div className="w-12 h-12 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide text-brand-gold uppercase">Loading 3D Masterplan Blueprint...</p>
          <p className="text-xs text-slate-400 mt-1">Rendering high-resolution CAD layout &amp; available plot inventory</p>
        </div>
      )}

      {/* TOP HUD BAR */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 md:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-auto">
          {/* Back to Project & Project Identity */}
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${project.slug}`}
              className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-gold" />
              <span>Back to Project</span>
            </Link>

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

          {/* Real-time Inventory Status Badges (Strictly Available, Booked, Sold) */}
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <div className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-medium backdrop-blur-sm">
              Total: <span className="font-bold text-white">{stats.total}</span>
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'available'
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/30'
                  : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available: <span className="font-bold">{stats.available}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'booked' ? 'all' : 'booked')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'booked'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-lg shadow-amber-500/30'
                  : 'bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Booked: <span className="font-bold">{stats.booked}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm ${
                statusFilter === 'sold'
                  ? 'bg-red-500 text-white ring-2 ring-red-300 shadow-lg shadow-red-500/30'
                  : 'bg-red-950/80 border border-red-500/50 text-red-300 hover:bg-red-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Sold: <span className="font-bold">{stats.sold}</span>
            </button>

            {/* Fullscreen & Close button */}
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

        {/* SECONDARY NAVIGATION BAR (Sectors & 2D/3D View) */}
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

          {/* 2D Blueprint / 3D Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle2D}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                is2DMode
                  ? 'bg-brand-primary text-brand-gold border-brand-gold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-brand-gold" />
              {is2DMode ? '3D Isometric View' : '2D Top-Down Blueprint'}
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
          <p className="text-[10px] text-brand-gold mt-1">Click to view plot specifications &amp; pricing</p>
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
              <div className="p-3 rounded-xl bg-slate-800/90 text-center text-xs text-slate-300 border border-slate-700">
                Plot #{selectedPlot.plotNumber} is <span className="font-bold uppercase text-red-400">{selectedPlot.status}</span>. Only 9 open plots are currently available: <span className="text-emerald-400 font-bold">1309, 1301, 1245, 1246, 1247, 1253, 1284, 486, 698</span>.
              </div>
            )}

            <a
              href={`https://wa.me/919666504405?text=${encodeURIComponent(
                `Hi Bhuwanta, I am viewing the 3D Layout of ${project.projectName} and inquiring about Plot #${selectedPlot.plotNumber} (${selectedPlot.areaSqYds} Sq. Yds, ${selectedPlot.facing} Facing, Status: ${selectedPlot.status}). Please share availability and payment details.`
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
        {/* Opens PDF directly in new tab as requested */}
        <a
          href={project.pdfLayoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-full font-medium text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 hover:bg-slate-800"
        >
          <FileText className="w-3.5 h-3.5 text-brand-gold" /> Official 2D Blueprint ↗
        </a>
      </div>

      {/* NEARBY LOCATIONS OVERLAY DRAWER */}
      {activeTab === 'landmarks' && (
        <div className="absolute bottom-16 left-4 right-4 md:left-auto md:right-4 md:w-96 max-h-[60vh] z-30 bg-slate-900/95 border border-brand-gold/40 shadow-2xl rounded-2xl p-4 backdrop-blur-xl text-white overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-gold" /> Key Connectivity Highlights
            </h3>
            <button onClick={() => setActiveTab('layout')} className="text-slate-400 hover:text-white cursor-pointer">
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
    </div>
  )
}
