import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { latLonToWorld, type LayoutDataset, type LayoutPlot, type LandUseKind, type PolygonWithHoles, type RegionDataset, type Ring } from '@/lib/layout3d/types'
import { RegionLayers } from './region'
import { buildVegetation } from './vegetation'
import { Traffic } from './traffic'
import { TouchGestures } from './touch'

/**
 * Framework-free three.js engine for the layout twin.
 *
 * Everything is real geometry built from vectors (no textures): plot edges,
 * roads and plot numbers stay sharp at every zoom level. The ventures sit at
 * their real positions inside real-world context (roads, villages, land use)
 * from OpenStreetMap. Dataset (x, y) → scene (X = x - ox, Z = y - oy); north is -Z.
 */

const SLAB = 1.1 // plot plinth height (world units)
const Y = { land: 0.02, green: 0.06, ctxWater: 0.07, water: 0.1, ctxRoad: 0.12, road: 0.14, mark: 0.2 }
const SKY = new THREE.Color('#dce8ef')
const LAND_COLORS: Record<LandUseKind, string> = {
  residential: '#ddd5c6',
  farm: '#d8dcb4',
  grass: '#c3dba0',
  park: '#b9d896',
  orchard: '#b7cf92',
  forest: '#9cc185',
  industrial: '#d6d1cd',
}
const HOUSE_COLORS = ['#f3efe6', '#eadfcd', '#f2e5d5', '#ddd7cd', '#f7f4ef', '#e8d2c3', '#d3dde2']

export type Quality = 'high' | 'low'
/** site = the ventures up close; nearby = landmarks & connection arcs; rings = ORR & RRR */
export type SceneMode = 'site' | 'nearby' | 'rings'

export interface OverlayItem {
  el: HTMLElement
  x: number
  y: number
  /** height above ground (world units) */
  lift: number
  /** higher wins when labels collide */
  priority: number
  /** hide when the camera is closer / farther than this (world units) */
  hideNear?: number
  hideFar?: number
  /** never hidden by decluttering: overlapping pins stack upwards instead (available plots) */
  sticky?: boolean
}

export interface LayoutSceneCallbacks {
  onHover: (plotId: string | null, clientX: number, clientY: number) => void
  onSelect: (plotId: string | null) => void
  onAzimuth: (deg: number) => void
  onReady: () => void
  onContextLost?: () => void
}

export interface PlotVisual {
  color: string
  dimmed: boolean
  /** digit colour */
  ink: string
}

interface FlyState {
  fromPos: THREE.Vector3
  toPos: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  t: number
  duration: number
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class LayoutScene {
  readonly ox: number
  readonly oy: number
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: MapControls
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pointerDirty = false
  private pointerClient = { x: 0, y: 0 }
  private downAt: { x: number; y: number; t: number } | null = null
  private frame = 0
  private disposed = false
  private resizeObserver: ResizeObserver
  private fly: FlyState | null = null
  private lastAzimuth = NaN
  private timer = new THREE.Timer()

  private plotMesh!: THREE.Mesh
  private plotStarts: number[] = []
  private plotCounts: number[] = []
  private shade!: Float32Array
  private outline!: THREE.LineSegments
  private digitMeshes = new Map<string, THREE.InstancedMesh>()
  private plotDigits: Array<Array<[string, number]>> = []
  private selection: THREE.Group | null = null
  private pulse = 0
  private visuals: PlotVisual[] = []
  private hovered = -1
  private overlay: OverlayItem[] = []
  private overlaySizes = new WeakMap<HTMLElement, { w: number; h: number }>()
  private far = false
  /** last stacking slot of each sticky pin, so crowded pins don't reshuffle while the map moves */
  private slotMemory = new WeakMap<HTMLElement, number[]>()
  private idIndex = new Map<string, number>()
  private tmpV = new THREE.Vector3()
  private traffic: Traffic | null = null
  private quality: Quality
  private region: RegionLayers | null = null
  private regionData: RegionDataset | null = null
  private mode: SceneMode = 'site'
  private span = 1000
  private siteFog!: THREE.Fog
  private rotateAfterFly = false
  private groundMesh: THREE.Mesh | null = null
  private touch!: TouchGestures
  /** screen space covered by UI (px); the 3D view is centred in what remains */
  private insets = { top: 0, right: 0, bottom: 0, left: 0 }
  /** what the projection uses right now: eases towards `insets` so the view glides when a card opens */
  private viewInsets = { top: 0, right: 0, bottom: 0, left: 0 }
  private insetsMeasured = false
  private reducedMotion = false

  constructor(
    private container: HTMLElement,
    canvas: HTMLCanvasElement,
    private data: LayoutDataset,
    private cb: LayoutSceneCallbacks,
    opts: { quality?: Quality; reducedMotion?: boolean } = {}
  ) {
    this.quality = opts.quality ?? 'high'
    this.reducedMotion = opts.reducedMotion ?? false
    const low = this.quality === 'low'
    // Origin = centre of all plots, so the camera orbits the ventures
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of data.plots) {
      for (let i = 0; i < p.p.length; i += 2) {
        minX = Math.min(minX, p.p[i]); maxX = Math.max(maxX, p.p[i])
        minY = Math.min(minY, p.p[i + 1]); maxY = Math.max(maxY, p.p[i + 1])
      }
    }
    this.ox = (minX + maxX) / 2
    this.oy = (minY + maxY) / 2
    data.plots.forEach((p, i) => this.idIndex.set(p.id, i))
    const bounds = data.bounds ?? [minX - 600, minY - 600, maxX + 600, maxY + 600]
    const span = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1])
    this.span = span

    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: low ? 'default' : 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2))
    this.renderer.setSize(w, h, false)
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    canvas.addEventListener('webglcontextlost', this.onContextLost)

    this.scene.background = SKY
    this.siteFog = new THREE.Fog(SKY, span * 1.7, span * 4.2)
    this.scene.fog = this.siteFog

    this.camera = new THREE.PerspectiveCamera(38, w / h, 1, span * 6)
    this.camera.position.set(0, 2600, 1400)

    this.controls = new MapControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.screenSpacePanning = false
    this.controls.maxPolarAngle = 1.3
    this.controls.minDistance = 14
    this.controls.maxDistance = span * 2.2
    this.controls.zoomToCursor = true
    this.controls.target.set(0, 0, 0)
    this.controls.addEventListener('start', () => {
      this.fly = null
      this.rotateAfterFly = false
      this.controls.autoRotate = false
    })
    this.controls.autoRotateSpeed = 0.55
    // Phones & tablets: map-style touch gestures (MapControls keeps mouse / trackpad)
    this.touch = new TouchGestures(container, canvas, this.camera, this.controls, {
      onStart: () => {
        this.fly = null
        this.rotateAfterFly = false
        this.controls.autoRotate = false
      },
      onTap: (x, y) => {
        const i = this.pickAt(x, y)
        this.cb.onSelect(i >= 0 ? this.data.plots[i].id : null)
      },
      onDoubleTap: (x, y) => this.zoomTowards(x, y, 0.5),
      minPolar: 0.001,
      maxPolar: () => this.controls.maxPolarAngle,
      minDistance: this.controls.minDistance,
      maxDistance: () => this.controls.maxDistance,
    })

    this.buildLights(maxX - minX, maxY - minY, low)
    this.buildGround(bounds)
    this.buildContext()
    this.buildFlat(data.greens, Y.green, new THREE.MeshStandardMaterial({ color: '#79b257', roughness: 1 }))
    this.buildFlat(data.water, Y.water, new THREE.MeshStandardMaterial({ color: '#2aa7e0', roughness: 0.25, metalness: 0.1 }))
    this.buildFlat(data.roads, Y.road, new THREE.MeshStandardMaterial({ color: '#55565b', roughness: 0.92 }))
    this.buildMarks()
    this.buildPlots()
    this.buildDigits()
    this.scene.add(buildVegetation(data.trees, (x, y) => this.world(x, y), { quality: this.quality, shadows: !low }))
    if (data.clubhouse) this.buildClubhouse(data.clubhouse)
    if (data.traffic) {
      this.traffic = new Traffic(data.traffic, (x, y) => this.world(x, y), {
        count: low ? 80 : 190,
        y: Y.road + 0.02,
        metersPerUnit: data.geo?.metersPerUnit ?? 1.43,
        shadows: !low,
        parked: opts.reducedMotion,
      })
      this.scene.add(this.traffic.group)
    }

    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)

    this.loop()
    this.cb.onReady()
  }

  // ───────────────────────── coordinate helpers ─────────────────────────
  world(x: number, y: number) {
    return { X: x - this.ox, Z: y - this.oy }
  }

  private ringToVec2(r: Ring) {
    const pts: THREE.Vector2[] = []
    // Shape space is (X, -Z) so that rotateX(-90°) lays it flat facing up
    for (let i = 0; i < r.length; i += 2) pts.push(new THREE.Vector2(r[i] - this.ox, -(r[i + 1] - this.oy)))
    return pts
  }

  private shapeOf(poly: PolygonWithHoles) {
    const s = new THREE.Shape(this.ringToVec2(poly.o))
    for (const h of poly.h) s.holes.push(new THREE.Path(this.ringToVec2(h)))
    return s
  }

  plotCentre(plot: LayoutPlot) {
    let x = 0, y = 0
    const n = plot.p.length / 2
    for (let i = 0; i < plot.p.length; i += 2) { x += plot.p[i]; y += plot.p[i + 1] }
    return { x: x / n, y: y / n }
  }

  // ───────────────────────── scene building ─────────────────────────
  private buildLights(spanX: number, spanY: number, low: boolean) {
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b8b29a', 1.35))
    const sun = new THREE.DirectionalLight('#fff3df', 2.1)
    sun.position.set(-700, 1400, 500)
    sun.castShadow = true
    const size = low ? 2048 : 4096
    sun.shadow.mapSize.set(size, size)
    const half = Math.max(spanX, spanY) * 0.62
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 100, far: 4000 })
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.4
    this.scene.add(sun)
    this.scene.add(sun.target)
  }

  /** Large ground with a gentle patchwork of field tones that fades into the haze. */
  private buildGround(b: [number, number, number, number]) {
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2
    const span = Math.max(b[2] - b[0], b[3] - b[1]) * 3.2
    const seg = this.quality === 'low' ? 90 : 160
    const g = new THREE.PlaneGeometry(span, span, seg, seg)
    g.rotateX(-Math.PI / 2)
    const c0 = new THREE.Color('#ebe8d8'), c1 = new THREE.Color('#dce7c8'), c2 = new THREE.Color('#e6dcc4')
    const pos = g.attributes.position
    const col = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx, z = pos.getZ(i) + cy
      const n1 = Math.sin(x * 0.0061 + Math.cos(z * 0.0047) * 1.7) * Math.cos(z * 0.0053 - x * 0.0021)
      const n2 = Math.sin(x * 0.019 + z * 0.013) * Math.sin(z * 0.017 - x * 0.007)
      c.copy(c0).lerp(c1, THREE.MathUtils.clamp(0.5 + n1 * 0.6, 0, 1)).lerp(c2, THREE.MathUtils.clamp(n2 * 0.5, 0, 0.45))
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))
    const w = this.world(cx, cy)
    m.position.set(w.X, 0, w.Z)
    m.receiveShadow = true
    this.groundMesh = m
    this.scene.add(m)
  }

  /** Real-world surroundings from OpenStreetMap. */
  private buildContext() {
    const ctx = this.data.context
    if (!ctx) return
    const byKind = new Map<LandUseKind, PolygonWithHoles[]>()
    for (const l of ctx.landuse) byKind.set(l.k, [...(byKind.get(l.k) ?? []), l])
    for (const [k, polys] of byKind) {
      this.buildFlat(polys, Y.land, new THREE.MeshStandardMaterial({ color: LAND_COLORS[k] ?? '#d9d4c4', roughness: 1 }))
    }
    this.buildFlat(ctx.water, Y.ctxWater, new THREE.MeshStandardMaterial({ color: '#6db6e6', roughness: 0.3, metalness: 0.05 }))
    this.buildFlat(ctx.roads, Y.ctxRoad, new THREE.MeshStandardMaterial({ color: '#66686e', roughness: 0.92 }))
    if (ctx.houses.length) {
      const geo = new THREE.BoxGeometry(1, 1, 1)
      geo.translate(0, 0.5, 0)
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), ctx.houses.length)
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
      const p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color()
      ctx.houses.forEach(([x, y, w, d, h, rot, ci], i) => {
        const wp = this.world(x, y)
        q.setFromAxisAngle(up, -rot)
        m.compose(p.set(wp.X, 0, wp.Z), q, s.set(w, h, d))
        mesh.setMatrixAt(i, m)
        mesh.setColorAt(i, c.set(HOUSE_COLORS[ci % HOUSE_COLORS.length]))
      })
      mesh.castShadow = this.quality === 'high'
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      this.scene.add(mesh)
    }
  }

  private buildFlat(polys: PolygonWithHoles[], y: number, mat: THREE.Material) {
    if (!polys.length) return
    const geo = new THREE.ShapeGeometry(polys.map((p) => this.shapeOf(p)), 2)
    geo.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = y
    mesh.receiveShadow = true
    this.scene.add(mesh)
  }

  private buildMarks() {
    const pos: number[] = []
    for (const q of this.data.marks) {
      const p = [0, 1, 2, 3].map((i) => this.world(q[i * 2], q[i * 2 + 1]))
      for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) {
        for (const k of [a, c, b]) pos.push(p[k].X, 0, p[k].Z)
      }
    }
    if (!pos.length) return
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#f4f4f0', side: THREE.DoubleSide }))
    mesh.position.y = Y.mark
    this.scene.add(mesh)
  }

  private buildPlots() {
    const geos: THREE.BufferGeometry[] = []
    let cursor = 0
    const outline: number[] = []
    for (const plot of this.data.plots) {
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(this.ringToVec2(plot.p)), {
        depth: SLAB,
        bevelEnabled: false,
        curveSegments: 1,
      })
      geo.rotateX(-Math.PI / 2)
      geo.deleteAttribute('uv')
      this.plotStarts.push(cursor)
      this.plotCounts.push(geo.attributes.position.count)
      cursor += geo.attributes.position.count
      geos.push(geo)
      const r = plot.p
      for (let i = 0; i < r.length; i += 2) {
        const a = this.world(r[i], r[i + 1])
        const j = (i + 2) % r.length
        const b = this.world(r[j], r[j + 1])
        outline.push(a.X, SLAB + 0.02, a.Z, b.X, SLAB + 0.02, b.Z)
      }
    }
    const merged = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!merged) throw new Error('Failed to merge plot geometry')
    const count = merged.attributes.position.count
    const normals = merged.attributes.normal
    this.shade = new Float32Array(count)
    for (let i = 0; i < count; i++) this.shade[i] = normals.getY(i) > 0.5 ? 1 : 0.74
    merged.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3))
    merged.computeBoundingSphere()
    this.plotMesh = new THREE.Mesh(
      merged,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 })
    )
    this.plotMesh.castShadow = true
    this.plotMesh.receiveShadow = true
    this.scene.add(this.plotMesh)

    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(outline, 3))
    this.outline = new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({ color: '#1f1d1a', transparent: true, opacity: 0.85 })
    )
    this.scene.add(this.outline)
  }

  private buildDigits() {
    const counts = new Map<string, number>()
    for (const p of this.data.plots) for (const g of p.g) counts.set(g[0], (counts.get(g[0]) ?? 0) + 1)
    for (const [ch, n] of counts) {
      const shapes = (this.data.digits[ch] ?? []).map((sh) => {
        // template coordinates are PDF-frame (y down) around the glyph centre
        const toV = (r: Ring) => {
          const v: THREE.Vector2[] = []
          for (let i = 0; i < r.length; i += 2) v.push(new THREE.Vector2(r[i], -r[i + 1]))
          return v
        }
        const s = new THREE.Shape(toV(sh.o))
        for (const h of sh.h) s.holes.push(new THREE.Path(toV(h)))
        return s
      })
      const geo = new THREE.ShapeGeometry(shapes, 3)
      geo.rotateX(-Math.PI / 2)
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })
      const mesh = new THREE.InstancedMesh(geo, mat, n)
      mesh.frustumCulled = false
      mesh.renderOrder = 2
      this.digitMeshes.set(ch, mesh)
      this.scene.add(mesh)
    }
    const used = new Map<string, number>()
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const black = new THREE.Color('#2a2622')
    this.data.plots.forEach((p) => {
      const refs: Array<[string, number]> = []
      for (const [ch, x, y, s, th] of p.g) {
        const mesh = this.digitMeshes.get(ch)
        if (!mesh) continue
        const i = used.get(ch) ?? 0
        used.set(ch, i + 1)
        const w = this.world(x, y)
        q.setFromAxisAngle(up, -th)
        m.compose(new THREE.Vector3(w.X, SLAB + 0.05, w.Z), q, new THREE.Vector3(s, 1, s))
        mesh.setMatrixAt(i, m)
        mesh.setColorAt(i, black)
        refs.push([ch, i])
      }
      this.plotDigits.push(refs)
    })
    for (const mesh of this.digitMeshes.values()) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  private buildClubhouse(ring: Ring) {
    const shape = new THREE.Shape(this.ringToVec2(ring))
    const grp = new THREE.Group()
    const mk = (depth: number, y: number, mat: THREE.Material) => {
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 })
      g.rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(g, mat)
      mesh.position.y = y
      mesh.castShadow = true
      mesh.receiveShadow = true
      grp.add(mesh)
    }
    mk(2.4, 0, new THREE.MeshStandardMaterial({ color: '#f6f1e7', roughness: 0.6 }))
    mk(1.3, 2.4, new THREE.MeshStandardMaterial({ color: '#4fa3c7', roughness: 0.15, metalness: 0.4 }))
    mk(1.6, 3.7, new THREE.MeshStandardMaterial({ color: '#f6f1e7', roughness: 0.6 }))
    mk(0.45, 5.3, new THREE.MeshStandardMaterial({ color: '#d2493f', roughness: 0.7 }))
    this.scene.add(grp)
  }

  // ───────────────────────── regional views ─────────────────────────
  private latLon(lat: number, lon: number) {
    if (!this.data.geo) return { X: 0, Z: 0 }
    const w = latLonToWorld(this.data.geo, lat, lon)
    return this.world(w.x, w.y)
  }

  /** Scene position of a lat/lon, in dataset units (for HTML pins). */
  latLonToData(lat: number, lon: number) {
    return this.data.geo ? latLonToWorld(this.data.geo, lat, lon) : { x: 0, y: 0 }
  }

  setRegion(region: RegionDataset) {
    if (this.region || !this.data.geo) return
    this.regionData = region
    this.region = new RegionLayers(region, (la, lo) => this.latLon(la, lo), Y.road)
    this.region.setResolution(this.container.clientWidth, this.container.clientHeight)
    this.scene.add(this.region.base, this.region.rings, this.region.nearby)
  }

  getMode() {
    return this.mode
  }

  /** Switch between the site and the regional views, framing the right area. */
  setMode(mode: SceneMode, fly = true) {
    this.mode = mode
    const regional = mode !== 'site'
    if (this.region) {
      this.region.base.visible = regional
      this.region.rings.visible = mode === 'rings'
      this.region.nearby.visible = mode === 'nearby'
    }
    this.controls.autoRotate = false
    // the site's patchwork ground would read as a square from far away; regional views use the plain base
    if (this.groundMesh) this.groundMesh.visible = !regional
    if (regional) {
      this.scene.fog = new THREE.Fog(SKY, 260000, 600000)
      this.camera.far = 900000
      this.controls.maxDistance = 260000
      this.controls.maxPolarAngle = 1.2
    } else {
      this.scene.fog = this.siteFog
      this.camera.far = this.span * 6
      this.controls.maxDistance = this.span * 2.2
      this.controls.maxPolarAngle = 1.3
    }
    this.camera.updateProjectionMatrix()
    if (!fly || !this.regionData) return
    const pts: Array<{ X: number; Z: number }> = [this.latLon(this.regionData.project.lat, this.regionData.project.lon)]
    if (mode === 'nearby') for (const l of this.regionData.landmarks) pts.push(this.latLon(l.lat, l.lon))
    if (mode === 'rings') {
      for (const line of [...this.regionData.orr.lines, ...this.regionData.rrr.north, this.regionData.rrr.southIndicative])
        for (const [la, lo] of line) pts.push(this.latLon(la, lo))
    }
    if (mode === 'site') return
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity
    for (const p of pts) { x0 = Math.min(x0, p.X); x1 = Math.max(x1, p.X); z0 = Math.min(z0, p.Z); z1 = Math.max(z1, p.Z) }
    const target = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2)
    const polar = mode === 'nearby' ? 0.62 : 0.5
    // labels sit on top of the landmark beacons, so leave room above each point
    const pts3 = pts.map((p) => new THREE.Vector3(p.X, 0, p.Z))
    const dist = this.fitPoints(pts3, target, polar, 0.12, mode === 'nearby' ? 1.25 : 1.08)
    this.flyTo(target, dist, polar, 0.12, 2.2)
  }

  /** Slow cinematic orbit around the current target; stops on any user input. */
  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on
    this.rotateAfterFly = false
  }

  /** Aerial 360°: frame the area, then keep orbiting until the user takes over. */
  aerialTour(x0: number, y0: number, x1: number, y1: number) {
    if (this.mode !== 'site') this.setMode('site', false)
    this.flyToBox(x0, y0, x1, y1, { polar: 0.85, duration: 2.0 })
    this.rotateAfterFly = true
  }

  // ───────────────────────── visual state ─────────────────────────
  setVisuals(visuals: PlotVisual[]) {
    this.visuals = visuals
    this.paint()
  }

  private paint() {
    const col = this.plotMesh.geometry.attributes.color as THREE.BufferAttribute
    const arr = col.array as Float32Array
    const c = new THREE.Color()
    const dimTo = new THREE.Color('#e2dccb')
    const white = new THREE.Color('#ffffff')
    const ink = new THREE.Color()
    this.data.plots.forEach((_, i) => {
      const v = this.visuals[i]
      if (!v) return
      c.set(v.color)
      if (v.dimmed) c.lerp(dimTo, 0.72)
      if (i === this.hovered) c.lerp(white, 0.35)
      const start = this.plotStarts[i], n = this.plotCounts[i]
      for (let k = start; k < start + n; k++) {
        const s = this.shade[k]
        arr[k * 3] = c.r * s; arr[k * 3 + 1] = c.g * s; arr[k * 3 + 2] = c.b * s
      }
      ink.set(v.ink)
      if (v.dimmed) ink.lerp(dimTo, 0.6)
      for (const [ch, idx] of this.plotDigits[i]) this.digitMeshes.get(ch)?.setColorAt(idx, ink)
    })
    col.needsUpdate = true
    for (const mesh of this.digitMeshes.values()) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  setSelected(id: string | null) {
    if (this.selection) {
      this.scene.remove(this.selection)
      this.selection.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
      })
      this.selection = null
    }
    if (!id) return
    const i = this.idIndex.get(id)
    if (i === undefined) return
    const plot = this.data.plots[i]
    const ctr = this.plotCentre(plot)
    // Glowing fence: ring slightly larger than the plot, with the plot cut out
    const inner = this.ringToVec2(plot.p)
    const cc = new THREE.Vector2(ctr.x - this.ox, -(ctr.y - this.oy))
    const outer = inner.map((p) => {
      const d = p.clone().sub(cc)
      const len = d.length() || 1
      return cc.clone().add(d.multiplyScalar((len + 0.9) / len))
    })
    const shape = new THREE.Shape(outer)
    shape.holes.push(new THREE.Path(inner))
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false, curveSegments: 1 })
    geo.rotateX(-Math.PI / 2)
    const fence = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: '#f5c451', emissive: '#f0a500', emissiveIntensity: 0.65, transparent: true, opacity: 0.95 })
    )
    const capGeo = new THREE.ShapeGeometry(new THREE.Shape(inner))
    capGeo.rotateX(-Math.PI / 2)
    const cap = new THREE.Mesh(
      capGeo,
      new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.35, depthWrite: false })
    )
    cap.position.y = SLAB + 0.03
    const grp = new THREE.Group()
    grp.add(fence, cap)
    this.selection = grp
    this.scene.add(grp)
  }

  /** Register HTML pins; items dropped from the list are hidden (not frozen in place). */
  setOverlay(items: OverlayItem[]) {
    const keep = new Set(items.map((i) => i.el))
    for (const old of this.overlay) if (!keep.has(old.el)) old.el.style.visibility = 'hidden'
    for (const it of items) {
      if (!this.overlaySizes.has(it.el)) this.overlaySizes.set(it.el, { w: it.el.offsetWidth, h: it.el.offsetHeight })
    }
    this.overlay = [...items].sort((a, b) => b.priority - a.priority)
  }

  // ───────────────────────── camera ─────────────────────────
  private flyTo(target: THREE.Vector3, distance: number, polar: number, azimuth: number, duration = 1.6) {
    const pos = new THREE.Vector3(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth)
    )
    this.fly = {
      fromPos: this.camera.position.clone(),
      toPos: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
      duration,
    }
  }

  /** Tell the engine which screen edges are covered by UI so framing and pins avoid them. */
  setInsets(insets: { top: number; right: number; bottom: number; left: number }) {
    const r = (v: number) => Math.max(0, Math.round(v))
    const next = { top: r(insets.top), right: r(insets.right), bottom: r(insets.bottom), left: r(insets.left) }
    if (JSON.stringify(next) === JSON.stringify(this.insets)) return
    this.insets = next
    // first measurement (and reduced motion): apply at once; afterwards the loop eases the shift
    if (!this.insetsMeasured || this.reducedMotion) {
      this.insetsMeasured = true
      this.viewInsets = { ...next }
      this.applyView()
    }
  }

  /** Ease the projection offset towards the measured insets (called every frame). */
  private animateInsets(dt: number) {
    const v = this.viewInsets, t = this.insets
    if (v.top === t.top && v.right === t.right && v.bottom === t.bottom && v.left === t.left) return
    const k = 1 - Math.exp(-dt * 11)
    let done = true
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      v[side] += (t[side] - v[side]) * k
      if (Math.abs(t[side] - v[side]) < 0.5) v[side] = t[side]
      else done = false
    }
    if (done) this.viewInsets = { ...t }
    this.applyView()
  }

  private applyView() {
    this.applyViewTo(this.camera, this.viewInsets)
  }

  /** Off-centre projection: the virtual frame is widened so its centre lands in the free area. */
  private applyViewTo(cam: THREE.PerspectiveCamera, insets: { top: number; right: number; bottom: number; left: number }) {
    const w = this.container.clientWidth, h = this.container.clientHeight
    if (!w || !h) return
    const { top, right, bottom, left } = insets
    const dx = right - left, dy = bottom - top
    const fullW = w + Math.abs(dx), fullH = h + Math.abs(dy)
    cam.aspect = fullW / fullH
    if (dx || dy) cam.setViewOffset(fullW, fullH, Math.max(dx, 0), Math.max(dy, 0), w, h)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
  }

  /** Fly to frame a dataset-space rectangle. */
  flyToBox(x0: number, y0: number, x1: number, y1: number, opts: { polar?: number; azimuth?: number; duration?: number } = {}) {
    const a = this.world(x0, y0), b = this.world(x1, y1)
    const target = new THREE.Vector3((a.X + b.X) / 2, 0, (a.Z + b.Z) / 2)
    const polar = opts.polar ?? 0.72
    const azimuth = opts.azimuth ?? this.controls.getAzimuthalAngle()
    const corners = [new THREE.Vector3(a.X, 0, a.Z), new THREE.Vector3(b.X, 0, a.Z), new THREE.Vector3(b.X, 0, b.Z), new THREE.Vector3(a.X, 0, b.Z)]
    const dist = this.fitPoints(corners, target, polar, azimuth, 1.06)
    this.flyTo(target, dist, polar, azimuth, opts.duration)
  }

  /**
   * Smallest camera distance (for this target / tilt / heading) at which every point lands inside
   * the part of the screen not covered by UI. Exact for the tilted perspective camera, including
   * the off-centre view offset, so plots at the edges never end up under a menu.
   */
  private fitPoints(points: THREE.Vector3[], target: THREE.Vector3, polar: number, azimuth: number, pad = 1.05) {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1
    const { top, right, bottom, left } = this.insets
    const nx0 = -1 + (2 * left) / w, nx1 = 1 - (2 * right) / w
    const ny0 = -1 + (2 * bottom) / h, ny1 = 1 - (2 * top) / h
    const cam = this.camera.clone()
    // fit against the final layout, even while the view is still easing towards it
    this.applyViewTo(cam, this.insets)
    const v = new THREE.Vector3()
    const fits = (d: number) => {
      cam.position.set(
        target.x + d * Math.sin(polar) * Math.sin(azimuth),
        target.y + d * Math.cos(polar),
        target.z + d * Math.sin(polar) * Math.cos(azimuth)
      )
      cam.lookAt(target)
      cam.updateMatrixWorld()
      for (const p of points) {
        v.copy(p).project(cam)
        if (v.z > 1 || v.x < nx0 || v.x > nx1 || v.y < ny0 || v.y > ny1) return false
      }
      return true
    }
    let lo = this.controls.minDistance, hi = this.controls.maxDistance
    if (fits(lo)) return lo * pad
    if (!fits(hi)) return hi
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) hi = mid
      else lo = mid
    }
    return Math.min(hi * pad, this.controls.maxDistance)
  }

  flyToPlot(id: string) {
    const i = this.idIndex.get(id)
    if (i === undefined) return
    const plot = this.data.plots[i]
    const c = this.plotCentre(plot)
    const w = this.world(c.x, c.y)
    const target = new THREE.Vector3(w.X, 0, w.Z)
    const azimuth = this.controls.getAzimuthalAngle()
    // fit the plot (with its neighbours around it) into the screen area left free by the UI
    const pts: THREE.Vector3[] = []
    for (let k = 0; k < plot.p.length; k += 2) {
      const q = this.world(plot.p[k], plot.p[k + 1])
      pts.push(new THREE.Vector3(q.X, SLAB, q.Z))
    }
    const dist = THREE.MathUtils.clamp(this.fitPoints(pts, target, 0.62, azimuth, 2.6), 70, 420)
    this.flyTo(target, dist, 0.62, azimuth, 1.4)
  }

  /** Jump high above the layout, then glide into the aerial view. */
  intro(x0: number, y0: number, x1: number, y1: number) {
    const a = this.world(x0, y0), b = this.world(x1, y1)
    this.camera.position.set((a.X + b.X) / 2, Math.min(3300, this.controls.maxDistance), (a.Z + b.Z) / 2 + 60)
    this.controls.target.set((a.X + b.X) / 2, 0, (a.Z + b.Z) / 2)
    this.controls.update()
    this.flyToBox(x0, y0, x1, y1, { polar: 0.78, azimuth: 0.18, duration: 2.8 })
  }

  resetNorth() {
    const t = this.controls.target.clone()
    const dist = this.camera.position.distanceTo(t)
    this.flyTo(t, dist, this.controls.getPolarAngle(), 0, 0.9)
  }

  topView() {
    const t = this.controls.target.clone()
    const dist = this.camera.position.distanceTo(t)
    this.flyTo(t, dist, 0.001, 0, 1.0)
  }

  zoomBy(factor: number) {
    const t = this.controls.target.clone()
    const dist = THREE.MathUtils.clamp(this.camera.position.distanceTo(t) * factor, this.controls.minDistance, this.controls.maxDistance)
    this.flyTo(t, dist, this.controls.getPolarAngle(), this.controls.getAzimuthalAngle(), 0.5)
  }

  // ───────────────────────── input ─────────────────────────
  private onPointerMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.pointerClient = { x: e.clientX - r.left, y: e.clientY - r.top }
    // touch has no hover: picking happens on tap only (no tooltip flicker while dragging)
    if (e.pointerType !== 'touch') this.pointerDirty = true
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  private onPointerUp = (e: PointerEvent) => {
    const d = this.downAt
    this.downAt = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > (e.pointerType === 'touch' ? 10 : 6) || performance.now() - d.t > 600) return
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    const i = this.pick()
    this.cb.onSelect(i >= 0 ? this.data.plots[i].id : null)
  }

  private onPointerLeave = () => {
    this.pointerDirty = false
    this.setHovered(-1)
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.cb.onContextLost?.()
  }

  /** Plot index under a client point, or -1. */
  private pickAt(clientX: number, clientY: number) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    return this.pick()
  }

  /** Glide closer, keeping the tapped ground point in view (double-tap). */
  private zoomTowards(clientX: number, clientY: number, factor: number) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera)
    const hit = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
    const t = this.controls.target.clone()
    const target = hit ? t.lerp(hit, 1 - factor) : t
    const dist = THREE.MathUtils.clamp(this.camera.position.distanceTo(this.controls.target) * factor, this.controls.minDistance, this.controls.maxDistance)
    this.flyTo(target, dist, this.controls.getPolarAngle(), this.controls.getAzimuthalAngle(), 0.45)
  }

  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObject(this.plotMesh, false)[0]
    if (!hit || hit.faceIndex == null) return -1
    const v = hit.faceIndex * 3
    let lo = 0, hi = this.plotStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.plotStarts[mid] <= v) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  private setHovered(i: number) {
    if (i === this.hovered) return
    this.hovered = i
    this.renderer.domElement.style.cursor = i >= 0 ? 'pointer' : ''
    this.paint()
    this.cb.onHover(i >= 0 ? this.data.plots[i].id : null, this.pointerClient.x, this.pointerClient.y)
  }

  // ───────────────────────── loop ─────────────────────────
  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.applyView()
    this.region?.setResolution(w, h)
  }

  private loop = () => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.loop)
    this.timer.update()
    const raw = this.timer.getDelta()
    // animation steps are clamped (no jumps after a stall); camera flights use real time so they
    // always finish in their stated duration, even on slow phones
    const dt = Math.min(raw, 0.05)
    const flyDt = Math.min(raw, 0.3)

    if (this.fly) {
      const f = this.fly
      f.t = Math.min(1, f.t + flyDt / f.duration)
      const k = easeInOut(f.t)
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k)
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k)
      if (f.t >= 1) {
        this.fly = null
        if (this.rotateAfterFly) {
          this.rotateAfterFly = false
          this.controls.autoRotate = true
        }
      }
    }
    this.touch.update(dt)
    this.animateInsets(flyDt)
    this.controls.update()
    this.traffic?.update(dt)
    this.region?.update(dt)

    // Level-of-detail: plot numbers & outlines fade with distance
    const dist = this.camera.position.distanceTo(this.controls.target)
    const digitAlpha = THREE.MathUtils.clamp((760 - dist) / 300, 0, 1)
    for (const mesh of this.digitMeshes.values()) {
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = digitAlpha
      mesh.visible = digitAlpha > 0.01
    }
    ;(this.outline.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.clamp((1900 - dist) / 1200, 0.18, 0.85)

    if (this.selection) {
      this.pulse += dt
      const fence = this.selection.children[0] as THREE.Mesh
      ;(fence.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(this.pulse * 4))
    }

    if (this.pointerDirty && !this.fly) {
      this.pointerDirty = false
      this.setHovered(this.pick())
    }

    const az = THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle())
    if (Math.abs(az - this.lastAzimuth) > 0.2 || Number.isNaN(this.lastAzimuth)) {
      this.lastAzimuth = az
      this.cb.onAzimuth(az)
    }

    this.renderer.render(this.scene, this.camera)
    this.updateOverlay(dist)
  }

  /** Position HTML pins; when two collide the lower-priority one is hidden. */
  private updateOverlay(dist: number) {
    if (!this.overlay.length) return
    // far away: pins switch to their compact style (CSS reads data-far) and get re-measured
    const far = this.mode === 'site' && dist > 700
    if (far !== this.far) {
      this.far = far
      this.container.dataset.far = far ? 'true' : 'false'
      this.overlaySizes = new WeakMap()
    }
    const w = this.container.clientWidth, h = this.container.clientHeight
    // UI panels (top bar, dock, legend, drawers…) are no-go zones for labels
    const base = this.container.getBoundingClientRect()
    const placed: Array<[number, number, number, number]> = []
    const chrome: Array<[number, number, number, number]> = []
    this.container.querySelectorAll<HTMLElement>('[data-ui-chrome]').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) chrome.push([r.left - base.left, r.top - base.top, r.right - base.left, r.bottom - base.top])
    })
    const hits = (rect: [number, number, number, number], list: Array<[number, number, number, number]>) =>
      list.some((r) => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1])
    for (const item of this.overlay) {
      const hide = () => {
        item.el.style.visibility = 'hidden'
      }
      if ((item.hideNear && dist < item.hideNear) || (item.hideFar && dist > item.hideFar)) { hide(); continue }
      const p = this.world(item.x, item.y)
      this.tmpV.set(p.X, item.lift, p.Z).project(this.camera)
      if (this.tmpV.z > 1 || Math.abs(this.tmpV.x) > 1.1 || Math.abs(this.tmpV.y) > 1.1) { hide(); continue }
      const sx = (this.tmpV.x * 0.5 + 0.5) * w
      const sy = (-this.tmpV.y * 0.5 + 0.5) * h
      let size = this.overlaySizes.get(item.el)
      if (!size) {
        size = { w: item.el.offsetWidth || 80, h: item.el.offsetHeight || 24 }
        this.overlaySizes.set(item.el, size)
      }
      let y = sy
      let rect: [number, number, number, number] = [sx - size.w / 2 - 3, y - size.h - 3, sx + size.w / 2 + 3, y + 3]
      let x = sx
      if (item.sticky) {
        // never disappear: if crowded, take the nearest free slot (up / sides / down) inside the free area
        const fx0 = this.insets.left, fy0 = this.insets.top, fx1 = w - this.insets.right, fy1 = h - this.insets.bottom
        const inside = (r: [number, number, number, number]) => r[0] >= fx0 && r[2] <= fx1 && r[1] >= fy0 && r[3] <= fy1
        const sw = size.w + 6, sh = size.h * 0.72
        // a short column above the cluster reads as a list of its plots; sides only as a last resort
        const slots = [
          [0, 0],
          ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => [0, -k * sh]),
          ...[1, 2, 3].map((k) => [0, k * sh]),
          // short screens (phone landscape): spread along rows beside the cluster
          ...[1, 2, 3, 4].flatMap((k) => [[k * sw, 0], [-k * sw, 0], [k * sw, -sh], [-k * sw, -sh], [k * sw, sh], [-k * sw, sh]]),
        ]
        const at = (ox: number, oy: number): [number, number, number, number] => [sx + ox - size.w / 2 - 3, sy + oy - size.h - 3, sx + ox + size.w / 2 + 3, sy + oy + 3]
        // a pin whose plot is in the visible area stacks within it; a pin whose plot has slid under
        // the UI or the screen edge simply follows its plot there (it never drifts away from it)
        const homeInside = inside(at(0, 0))
        const ok = ([ox, oy]: number[]) => !hits(at(ox, oy), placed) && (!homeInside || inside(at(ox, oy)))
        const prevSlot = this.slotMemory.get(item.el)
        // home if there is room, else the slot it already had, else the nearest free one
        const slot =
          (ok([0, 0]) ? [0, 0] : null) ??
          (prevSlot && ok(prevSlot) ? prevSlot : null) ??
          slots.find(ok) ??
          [0, 0]
        this.slotMemory.set(item.el, slot)
        x = sx + slot[0]
        y = sy + slot[1]
        rect = at(slot[0], slot[1])
      } else if (hits(rect, placed) || (item.priority < 200 && hits(rect, chrome))) {
        // key pins (priority ≥ 200) may sit beside panels; everything else avoids UI and other labels
        hide()
        continue
      }
      placed.push(rect)
      item.el.style.visibility = 'visible'
      item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    const c = this.renderer.domElement
    c.removeEventListener('pointermove', this.onPointerMove)
    c.removeEventListener('pointerdown', this.onPointerDown)
    c.removeEventListener('pointerup', this.onPointerUp)
    c.removeEventListener('pointerleave', this.onPointerLeave)
    c.removeEventListener('webglcontextlost', this.onContextLost)
    this.touch.dispose()
    this.controls.dispose()
    this.traffic?.dispose()
    this.region?.dispose()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
    this.renderer.dispose()
  }
}
