import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { RegionDataset, RegionPoint } from '@/lib/layout3d/types'

/**
 * Regional layers for the "Nearby locations" and "ORR & RRR" views: ring roads
 * and connection arcs drawn with screen-space (pixel-width) lines so they stay
 * crisp whether the camera is 5 km or 100 km away.
 */

type ToScene = (lat: number, lon: number) => { X: number; Z: number }

export const LANDMARK_COLORS: Record<string, string> = {
  airport: '#38bdf8',
  it: '#a78bfa',
  industry: '#f59e0b',
  culture: '#f472b6',
  transport: '#34d399',
  town: '#fbbf24',
}

export class RegionLayers {
  readonly rings = new THREE.Group()
  readonly nearby = new THREE.Group()
  readonly base = new THREE.Group()
  private materials: LineMaterial[] = []
  private flowing: LineMaterial[] = []

  constructor(region: RegionDataset, private toScene: ToScene, y: number) {
    this.rings.name = 'region-rings'
    this.nearby.name = 'region-nearby'
    this.base.name = 'region-base'
    this.rings.visible = this.nearby.visible = this.base.visible = false

    // Large plain ground so the camera never sees the edge at regional scale
    const g = new THREE.PlaneGeometry(400000, 400000)
    g.rotateX(-Math.PI / 2)
    const ground = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#e4e0cc', fog: false }))
    ground.position.y = -0.6
    this.base.add(ground)

    const proj = toScene(region.project.lat, region.project.lon)

    // ORR – glowing cyan ring
    for (const line of region.orr.lines) {
      this.addLine(this.rings, line, '#22d3ee', 9, 0.25, y + 2)
      this.addLine(this.rings, line, '#0e7490', 3.2, 1, y + 3)
    }
    // RRR – orange: mapped northern alignment solid, southern arc dashed (indicative)
    for (const line of region.rrr.north) {
      this.addLine(this.rings, line, '#fb923c', 9, 0.25, y + 2)
      this.addLine(this.rings, line, '#ea580c', 3.2, 1, y + 3)
    }
    const south = this.smooth(region.rrr.southIndicative.map(([la, lo]) => toScene(la, lo)), 14)
    this.addPoints(this.rings, south, '#ea580c', 3, 0.95, y + 3, { dashed: true, dash: 1400, gap: 900 })

    // Connection arcs from the project to every landmark (animated flow)
    for (const lm of region.landmarks) this.addArc(proj, lm)
    // A short beacon over the project, visible from every regional view
    this.addPoints(this.nearby, [proj, proj], '#facc15', 5, 1, 0, { heights: [0, 2600] })
    this.addPoints(this.rings, [proj, proj], '#facc15', 5, 1, 0, { heights: [0, 6000] })
  }

  private smooth(pts: Array<{ X: number; Z: number }>, steps: number) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.X, 0, p.Z)), false, 'centripetal')
    return curve.getPoints(pts.length * steps).map((v) => ({ X: v.x, Z: v.z }))
  }

  private addLine(group: THREE.Group, line: [number, number][], color: string, width: number, opacity: number, y: number) {
    this.addPoints(group, line.map(([la, lo]) => this.toScene(la, lo)), color, width, opacity, y)
  }

  private addPoints(
    group: THREE.Group,
    pts: Array<{ X: number; Z: number }>,
    color: string,
    width: number,
    opacity: number,
    y: number,
    o: { dashed?: boolean; dash?: number; gap?: number; heights?: number[] } = {}
  ) {
    const pos: number[] = []
    pts.forEach((p, i) => pos.push(p.X, o.heights ? o.heights[i] : y, p.Z))
    const geo = new LineGeometry()
    geo.setPositions(pos)
    const mat = new LineMaterial({
      color,
      linewidth: width,
      transparent: opacity < 1,
      opacity,
      dashed: !!o.dashed,
      dashSize: o.dash ?? 1,
      gapSize: o.gap ?? 1,
      worldUnits: false,
      fog: false,
    })
    mat.depthWrite = opacity >= 1
    const line = new Line2(geo, mat)
    if (o.dashed) line.computeLineDistances()
    line.frustumCulled = false
    line.renderOrder = 5
    group.add(line)
    this.materials.push(mat)
    return mat
  }

  private addArc(from: { X: number; Z: number }, lm: RegionPoint) {
    const to = this.toScene(lm.lat, lm.lon)
    const a = new THREE.Vector3(from.X, 0, from.Z)
    const b = new THREE.Vector3(to.X, 0, to.Z)
    const mid = a.clone().lerp(b, 0.5)
    mid.y = a.distanceTo(b) * 0.18
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    const pts = curve.getPoints(64)
    const color = LANDMARK_COLORS[lm.k] ?? '#fbbf24'
    const pos = pts.flatMap((p) => [p.x, p.y + 4, p.z])
    const mk = (width: number, opacity: number, dashed: boolean) => {
      const geo = new LineGeometry()
      geo.setPositions(pos)
      const mat = new LineMaterial({
        color,
        linewidth: width,
        transparent: true,
        opacity,
        dashed,
        dashSize: 700,
        gapSize: 500,
        worldUnits: false,
        fog: false,
      })
      mat.depthWrite = false
      const line = new Line2(geo, mat)
      if (dashed) line.computeLineDistances()
      line.frustumCulled = false
      line.renderOrder = 6
      this.nearby.add(line)
      this.materials.push(mat)
      return mat
    }
    mk(7, 0.22, false)
    this.flowing.push(mk(2.6, 1, true))
    // ground beacon at the landmark
    this.addPoints(this.nearby, [to, to], color, 4, 1, 0, { heights: [0, 1300] })
  }

  setResolution(w: number, h: number) {
    for (const m of this.materials) m.resolution.set(w, h)
  }

  update(dt: number) {
    if (!this.nearby.visible) return
    for (const m of this.flowing) m.dashOffset -= dt * 1500
  }

  dispose() {
    for (const g of [this.rings, this.nearby, this.base]) {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof Line2) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
    }
  }
}
