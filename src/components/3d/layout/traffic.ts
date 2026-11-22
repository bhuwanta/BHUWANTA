import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { TrafficGraph } from '@/lib/layout3d/types'

/**
 * Ambient traffic on the extracted road graph. Vehicles keep left (India),
 * pick a new road at every junction (wider roads preferred) and glide through
 * bends. Everything is instanced: one draw call per vehicle type.
 */

type WorldFn = (x: number, y: number) => { X: number; Z: number }

export interface TrafficOptions {
  count: number
  /** road surface height */
  y: number
  /** metres per world unit */
  metersPerUnit: number
  /** vehicles are shown slightly larger than life so they read from the air */
  exaggeration?: number
  shadows: boolean
  /** freeze vehicles (prefers-reduced-motion) */
  parked?: boolean
}

interface Edge {
  a: number
  b: number
  w: number
  xs: Float32Array
  zs: Float32Array
  cum: Float32Array
  len: number
  main: boolean
}

type Kind = 'car' | 'suv' | 'auto' | 'bus' | 'truck'

interface Vehicle {
  kind: Kind
  idx: number
  edge: number
  dir: 1 | -1
  s: number
  speed: number
  x: number
  z: number
  yaw: number
  init: boolean
}

const MAIN_HALF_WIDTH = 3.6
const PAINT: Record<Kind, string[]> = {
  car: ['#f4f4f2', '#f4f4f2', '#f4f4f2', '#c9ccd1', '#c9ccd1', '#8c9096', '#2b2d31', '#22457a', '#c8b48f', '#2f6f73', '#7a4a32'],
  suv: ['#f4f4f2', '#f4f4f2', '#c9ccd1', '#2b2d31', '#8c9096', '#22457a', '#5b5e3c'],
  auto: ['#ffffff'],
  bus: ['#f2f2f2', '#2f6fb5', '#f2b632', '#4f9a54'],
  truck: ['#f08a24', '#2a62b5', '#e0b227', '#5f8f3a', '#f4f4f2'],
}
const SPEED_MS: Record<Kind, number> = { car: 11, suv: 11, auto: 8, bus: 9, truck: 8 }

const rnd = (i: number) => {
  const s = Math.sin(i * 91.345 + 3.7) * 43758.5453
  return s - Math.floor(s)
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, rgb: [number, number, number]) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return colour(g, rgb)
}

function wheel(x: number, z: number, r: number) {
  const g = new THREE.CylinderGeometry(r, r, r * 0.8, 8)
  g.rotateX(Math.PI / 2)
  g.translate(x, r, z)
  return colour(g, [0.07, 0.07, 0.08])
}

function colour(g: THREE.BufferGeometry, rgb: [number, number, number]) {
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set(rgb, i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

const PAINTED: [number, number, number] = [1, 1, 1]
const GLASS: [number, number, number] = [0.13, 0.16, 0.2]

/** Vehicle bodies in metres, length along +X. */
function vehicleGeometry(kind: Kind): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  switch (kind) {
    case 'car':
      parts.push(box(4.1, 0.75, 1.75, 0, 0.62, 0, PAINTED), box(2.2, 0.62, 1.6, -0.25, 1.3, 0, GLASS))
      for (const [x, z] of [[1.35, 0.8], [1.35, -0.8], [-1.35, 0.8], [-1.35, -0.8]]) parts.push(wheel(x, z, 0.32))
      break
    case 'suv':
      parts.push(box(4.6, 0.95, 1.85, 0, 0.75, 0, PAINTED), box(2.7, 0.75, 1.75, -0.3, 1.58, 0, GLASS))
      for (const [x, z] of [[1.55, 0.85], [1.55, -0.85], [-1.55, 0.85], [-1.55, -0.85]]) parts.push(wheel(x, z, 0.36))
      break
    case 'auto':
      parts.push(
        box(2.4, 0.95, 1.3, -0.1, 0.72, 0, [0.16, 0.46, 0.2]),
        box(2.0, 0.22, 1.36, -0.2, 1.78, 0, [0.98, 0.83, 0.2]),
        box(0.5, 0.65, 0.55, 1.25, 0.62, 0, [0.16, 0.46, 0.2]),
        box(0.08, 0.6, 1.2, 0.75, 1.4, 0, GLASS)
      )
      parts.push(wheel(1.15, 0, 0.26), wheel(-0.95, 0.58, 0.26), wheel(-0.95, -0.58, 0.26))
      break
    case 'bus':
      parts.push(box(10, 2.1, 2.55, 0, 1.55, 0, PAINTED), box(9.6, 0.8, 2.6, -0.1, 2.0, 0, GLASS), box(0.06, 1.0, 2.2, 5.02, 1.9, 0, GLASS))
      for (const [x, z] of [[3.4, 1.1], [3.4, -1.1], [-3.4, 1.1], [-3.4, -1.1]]) parts.push(wheel(x, z, 0.5))
      break
    case 'truck':
      parts.push(
        box(2.0, 2.1, 2.35, 3.1, 1.55, 0, PAINTED),
        box(0.06, 0.8, 2.0, 4.12, 2.0, 0, GLASS),
        box(5.4, 2.4, 2.45, -0.75, 1.75, 0, [0.62, 0.5, 0.36])
      )
      for (const [x, z] of [[3.0, 1.0], [3.0, -1.0], [-1.6, 1.0], [-1.6, -1.0], [-2.8, 1.0], [-2.8, -1.0]]) parts.push(wheel(x, z, 0.48))
      break
  }
  for (const p of parts) p.deleteAttribute('uv')
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error('vehicle geometry')
  return merged
}

export class Traffic {
  readonly group = new THREE.Group()
  private edges: Edge[] = []
  private adj: number[][] = []
  private vehicles: Vehicle[] = []
  private meshes = new Map<Kind, THREE.InstancedMesh>()
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private up = new THREE.Vector3(0, 1, 0)
  private p = new THREE.Vector3()
  private scale: THREE.Vector3

  constructor(graph: TrafficGraph, world: WorldFn, private opts: TrafficOptions) {
    this.group.name = 'traffic'
    const k = (opts.exaggeration ?? 1.2) / opts.metersPerUnit
    this.scale = new THREE.Vector3(k, k, k)
    const nodeCount = graph.nodes.length / 2
    this.adj = Array.from({ length: nodeCount }, () => [])
    graph.edges.forEach((e, i) => {
      const n = e.p.length / 2
      const xs = new Float32Array(n), zs = new Float32Array(n), cum = new Float32Array(n)
      for (let j = 0; j < n; j++) {
        const w = world(e.p[j * 2], e.p[j * 2 + 1])
        xs[j] = w.X
        zs[j] = w.Z
        if (j) cum[j] = cum[j - 1] + Math.hypot(xs[j] - xs[j - 1], zs[j] - zs[j - 1])
      }
      this.edges.push({ a: e.a, b: e.b, w: e.w, xs, zs, cum, len: cum[n - 1], main: e.w >= MAIN_HALF_WIDTH })
      this.adj[e.a]?.push(i)
      if (e.b !== e.a) this.adj[e.b]?.push(i)
    })
    this.spawn()
  }

  private spawn() {
    const usable = this.edges.map((e, i) => ({ e, i })).filter(({ e }) => e.len > 8)
    if (!usable.length) return
    const weights = usable.map(({ e }) => e.len * (e.main ? 2.6 : 1))
    const total = weights.reduce((a, b) => a + b, 0)
    const counts: Record<Kind, number> = { car: 0, suv: 0, auto: 0, bus: 0, truck: 0 }
    for (let n = 0; n < this.opts.count; n++) {
      let r = rnd(n * 2 + 1) * total
      let pick = 0
      while (pick < usable.length - 1 && r > weights[pick]) r -= weights[pick++]
      const { e, i } = usable[pick]
      const t = rnd(n * 5 + 3)
      const kind: Kind = e.main
        ? t < 0.5 ? 'car' : t < 0.65 ? 'suv' : t < 0.75 ? 'auto' : t < 0.86 ? 'bus' : 'truck'
        : t < 0.6 ? 'car' : t < 0.8 ? 'suv' : 'auto'
      const v: Vehicle = {
        kind,
        idx: counts[kind]++,
        edge: i,
        dir: rnd(n * 7 + 5) < 0.5 ? 1 : -1,
        s: rnd(n * 11 + 7) * e.len,
        speed: (SPEED_MS[kind] * (0.8 + rnd(n * 13 + 9) * 0.4) * (e.main ? 1.4 : 1) * 1.5) / this.opts.metersPerUnit,
        x: 0,
        z: 0,
        yaw: 0,
        init: false,
      }
      this.vehicles.push(v)
    }
    const c = new THREE.Color()
    for (const kind of Object.keys(counts) as Kind[]) {
      if (!counts[kind]) continue
      const mesh = new THREE.InstancedMesh(
        vehicleGeometry(kind),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15 }),
        counts[kind]
      )
      mesh.castShadow = this.opts.shadows
      mesh.frustumCulled = false
      const pal = PAINT[kind]
      for (let i = 0; i < counts[kind]; i++) mesh.setColorAt(i, c.set(pal[Math.floor(rnd(i * 17 + kind.length) * pal.length)]))
      this.meshes.set(kind, mesh)
      this.group.add(mesh)
    }
    this.update(0)
  }

  /** Choose the next edge at a node: avoid U-turns, prefer straight-ish and wider roads. */
  private next(from: number, node: number, hx: number, hz: number): { edge: number; dir: 1 | -1 } {
    const options = (this.adj[node] ?? []).filter((i) => i !== from)
    if (!options.length) return { edge: from, dir: this.edges[from].a === node ? 1 : -1 }
    let best = options[0], bestScore = -Infinity
    for (const i of options) {
      const e = this.edges[i]
      const dir: 1 | -1 = e.a === node ? 1 : -1
      const j0 = dir === 1 ? 0 : e.xs.length - 1
      const j1 = dir === 1 ? Math.min(1, e.xs.length - 1) : Math.max(e.xs.length - 2, 0)
      const dx = e.xs[j1] - e.xs[j0], dz = e.zs[j1] - e.zs[j0]
      const l = Math.hypot(dx, dz) || 1
      const straight = (dx * hx + dz * hz) / l
      const score = (straight + 1.3) * (e.main ? 2.2 : 1) * (0.6 + Math.random() * 0.8)
      if (score > bestScore) { bestScore = score; best = i }
    }
    return { edge: best, dir: this.edges[best].a === node ? 1 : -1 }
  }

  private sample(e: Edge, dist: number, out: { x: number; z: number; tx: number; tz: number }) {
    const d = Math.min(Math.max(dist, 0), e.len)
    let lo = 0, hi = e.cum.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (e.cum[mid] <= d) lo = mid
      else hi = mid
    }
    const seg = e.cum[hi] - e.cum[lo] || 1
    const t = (d - e.cum[lo]) / seg
    out.x = e.xs[lo] + (e.xs[hi] - e.xs[lo]) * t
    out.z = e.zs[lo] + (e.zs[hi] - e.zs[lo]) * t
    out.tx = (e.xs[hi] - e.xs[lo]) / seg
    out.tz = (e.zs[hi] - e.zs[lo]) / seg
  }

  private tmp = { x: 0, z: 0, tx: 1, tz: 0 }

  update(dt: number) {
    const smooth = dt > 0 ? 1 - Math.exp(-dt * 9) : 1
    for (const v of this.vehicles) {
      if (!this.opts.parked) v.s += v.speed * dt
      let e = this.edges[v.edge]
      let guard = 0
      while (v.s > e.len && guard++ < 4) {
        const over = v.s - e.len
        const node = v.dir === 1 ? e.b : e.a
        this.sample(e, v.dir === 1 ? e.len : 0, this.tmp)
        const hx = this.tmp.tx * v.dir, hz = this.tmp.tz * v.dir
        const nx = this.next(v.edge, node, hx, hz)
        v.edge = nx.edge
        v.dir = nx.dir
        v.s = over
        e = this.edges[v.edge]
      }
      this.sample(e, v.dir === 1 ? v.s : e.len - v.s, this.tmp)
      const tx = this.tmp.tx * v.dir, tz = this.tmp.tz * v.dir
      // keep left: the left of the travel direction is (tz, -tx) on the ground plane
      const lane = Math.min(Math.max(e.w * 0.46, 0.9), 3.4)
      const x = this.tmp.x + tz * lane
      const z = this.tmp.z - tx * lane
      const yaw = Math.atan2(-tz, tx)
      if (!v.init) {
        v.x = x; v.z = z; v.yaw = yaw; v.init = true
      } else {
        v.x += (x - v.x) * smooth
        v.z += (z - v.z) * smooth
        let dy = yaw - v.yaw
        dy = Math.atan2(Math.sin(dy), Math.cos(dy))
        v.yaw += dy * smooth
      }
      const mesh = this.meshes.get(v.kind)
      if (!mesh) continue
      this.q.setFromAxisAngle(this.up, v.yaw)
      this.m.compose(this.p.set(v.x, this.opts.y, v.z), this.q, this.scale)
      mesh.setMatrixAt(v.idx, this.m)
    }
    for (const mesh of this.meshes.values()) mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
  }
}
