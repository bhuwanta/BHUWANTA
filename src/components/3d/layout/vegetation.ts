import * as THREE from 'three'
import type { TreePlacement } from '@/lib/layout3d/types'

/**
 * Instanced low-poly vegetation. One draw call per tree part, so thousands of
 * trees stay cheap. Sizes are in world units (≈ 1.43 m).
 */

type WorldFn = (x: number, y: number) => { X: number; Z: number }

export interface VegetationOptions {
  /** 'low' drops part of the generated countryside trees and uses coarser canopies */
  quality: 'high' | 'low'
  shadows: boolean
}

// Deterministic pseudo-random in [0, 1) so the scene looks the same every visit
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

const FLAG_GENERATED = 1
const FLAG_GUARD = 2

export function buildVegetation(trees: TreePlacement[], world: WorldFn, opts: VegetationOptions): THREE.Group {
  const group = new THREE.Group()
  group.name = 'vegetation'
  const list =
    opts.quality === 'low'
      ? trees.filter((t, i) => {
          const f = t[4] ?? 0
          return !(f & FLAG_GENERATED) || f & FLAG_GUARD || rnd(i * 3.17) < 0.5
        })
      : trees
  const detail = opts.quality === 'low' ? 0 : 1
  const byKind: TreePlacement[][] = [[], [], [], []]
  for (const t of list) byKind[t[2]]?.push(t)

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const c = new THREE.Color()

  const foliage = (flat = true) =>
    new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: flat })
  const bark = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 })
  const make = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n)
    mesh.castShadow = opts.shadows
    mesh.frustumCulled = false
    group.add(mesh)
    return mesh
  }
  const trunkGeo = () => {
    const g = new THREE.CylinderGeometry(0.06, 0.1, 1, 5)
    g.translate(0, 0.5, 0)
    return g
  }
  const greenOf = (seed: number, hueBase = 0.27, light = 0.27) => {
    const r = rnd(seed)
    if (r < 0.035) return c.set('#d8bf45') // copper-pod yellow
    if (r < 0.06) return c.set('#a890cf') // jacaranda lilac
    return c.setHSL(hueBase + rnd(seed + 1) * 0.07, 0.45 + rnd(seed + 2) * 0.15, light + rnd(seed + 3) * 0.08)
  }

  // 0 · shrubs
  const shrubs = byKind[0]
  if (shrubs.length) {
    const mesh = make(new THREE.IcosahedronGeometry(1, detail), foliage(), shrubs.length)
    shrubs.forEach((t, i) => {
      const r = t[3] * 0.17 * (0.85 + rnd(i) * 0.3)
      const w = world(t[0], t[1])
      q.setFromAxisAngle(up, rnd(i + 7) * Math.PI)
      m.compose(pos.set(w.X, r * 0.8, w.Z), q, scl.set(r, r * 0.88, r))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.setHSL(0.26 + rnd(i + 3) * 0.06, 0.5, 0.28 + rnd(i + 5) * 0.08))
    })
  }

  // 1 · palms (toddy palms in the fields, ornamental palms in parks)
  const palms = byKind[1]
  if (palms.length) {
    const trunks = make(trunkGeo(), bark, palms.length)
    const crownGeo = new THREE.ConeGeometry(1, 0.42, 9, 1, true)
    crownGeo.rotateX(Math.PI)
    const crownMat = foliage()
    crownMat.side = THREE.DoubleSide
    const crowns = make(crownGeo, crownMat, palms.length)
    palms.forEach((t, i) => {
      const h = t[3] * 0.22 * (0.85 + rnd(i + 11) * 0.3)
      const w = world(t[0], t[1])
      m.compose(pos.set(w.X, 0, w.Z), q.identity(), scl.set(h * 0.9, h, h * 0.9))
      trunks.setMatrixAt(i, m)
      const cr = h * 0.4
      q.setFromAxisAngle(up, rnd(i) * Math.PI)
      m.compose(pos.set(w.X, h * 0.98, w.Z), q, scl.set(cr, cr, cr))
      crowns.setMatrixAt(i, m)
      crowns.setColorAt(i, c.setHSL(0.3 + rnd(i + 2) * 0.05, 0.55, 0.27 + rnd(i + 9) * 0.06))
    })
  }

  // 2 · broadleaf shade trees (neem / rain trees)
  const broad = byKind[2]
  if (broad.length) {
    const trunks = make(trunkGeo(), bark, broad.length)
    const canopy = make(new THREE.IcosahedronGeometry(1, detail), foliage(), broad.length)
    broad.forEach((t, i) => {
      const s = t[3] * (0.9 + rnd(i + 21) * 0.2)
      const w = world(t[0], t[1])
      const th = s * 0.42
      m.compose(pos.set(w.X, 0, w.Z), q.identity(), scl.set(s * 0.55, th, s * 0.55))
      trunks.setMatrixAt(i, m)
      const r = s * 0.36
      q.setFromAxisAngle(up, rnd(i + 5) * Math.PI)
      m.compose(pos.set(w.X, th + r * 0.55, w.Z), q, scl.set(r, r * 0.8, r))
      canopy.setMatrixAt(i, m)
      canopy.setColorAt(i, greenOf(i * 7 + 1))
    })
  }

  // 3 · ashoka avenue trees (tall and slender)
  const ashoka = byKind[3]
  if (ashoka.length) {
    const trunks = make(trunkGeo(), bark, ashoka.length)
    const coneGeo = new THREE.ConeGeometry(1, 1, detail ? 8 : 6)
    coneGeo.translate(0, 0.5, 0)
    const cones = make(coneGeo, foliage(), ashoka.length)
    ashoka.forEach((t, i) => {
      const s = t[3] * (0.9 + rnd(i + 31) * 0.2)
      const w = world(t[0], t[1])
      m.compose(pos.set(w.X, 0, w.Z), q.identity(), scl.set(s * 0.35, s * 0.14, s * 0.35))
      trunks.setMatrixAt(i, m)
      q.setFromAxisAngle(up, rnd(i) * Math.PI)
      m.compose(pos.set(w.X, s * 0.1, w.Z), q, scl.set(s * 0.15, s * 0.9, s * 0.15))
      cones.setMatrixAt(i, m)
      cones.setColorAt(i, c.setHSL(0.31 + rnd(i + 4) * 0.04, 0.5, 0.2 + rnd(i + 6) * 0.06))
    })
  }

  // Tree guards (white-washed brick rings) for trees planted on road verges
  const guarded = list.filter((t) => (t[4] ?? 0) & FLAG_GUARD)
  if (guarded.length) {
    const ring = new THREE.CylinderGeometry(0.55, 0.55, 0.8, 10, 1, true)
    ring.translate(0, 0.4, 0)
    const mesh = new THREE.InstancedMesh(
      ring,
      new THREE.MeshStandardMaterial({ color: '#eee8dc', roughness: 0.95, side: THREE.DoubleSide }),
      guarded.length
    )
    mesh.frustumCulled = false
    guarded.forEach((t, i) => {
      const w = world(t[0], t[1])
      m.compose(pos.set(w.X, 0.12, w.Z), q.identity(), scl.set(1, 1, 1))
      mesh.setMatrixAt(i, m)
    })
    group.add(mesh)
  }

  group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) {
      o.instanceMatrix.needsUpdate = true
      if (o.instanceColor) o.instanceColor.needsUpdate = true
    }
  })
  return group
}
