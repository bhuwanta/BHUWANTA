import * as THREE from 'three'
import type { MapControls } from 'three/examples/jsm/controls/MapControls.js'

/**
 * Google-Maps-style touch gestures for phones and tablets (mouse / trackpad keep MapControls):
 *
 *   1 finger            drag the ground under the finger (with fling momentum)
 *   2 fingers           pinch = zoom about the fingers, twist = rotate, move = pan
 *   2 fingers up/down   tilt (decided at gesture start: both fingers moving vertically together)
 *   tap                 select (onTap)          double-tap  zoom in on that spot
 *
 * Touch pointers are captured before they reach MapControls, so the two never fight.
 * Each finger's movement arrives as its own event, so two-finger gestures are evaluated
 * once per frame from both fingers' latest positions (see update()); otherwise a parallel
 * two-finger swipe would briefly look like a twist between the two events.
 */

interface Pt {
  x: number
  y: number
}

export interface TouchHooks {
  /** a gesture started: cancel camera flights / auto-rotate */
  onStart: () => void
  /** a tap (no movement): client coordinates */
  onTap: (clientX: number, clientY: number) => void
  /** double-tap: zoom in towards this client point */
  onDoubleTap: (clientX: number, clientY: number) => void
  minPolar: number
  maxPolar: () => number
  minDistance: number
  maxDistance: () => number
}

const TAP_SLOP = 10
/** max press length for a tap, measured with event timestamps (immune to main-thread lag) */
const TAP_MAX_MS = 600
const DOUBLE_TAP_MS = 350
const TILT_PER_PX = 0.006
/** twist needed before the map starts rotating, so a plain pinch never turns it by accident */
const ROTATE_THRESHOLD = 0.17 // ~10°

export class TouchGestures {
  private pts = new Map<number, Pt>()
  private start = new Map<number, Pt>()
  /** the two fingers' positions as of the last processed frame */
  private pair: [Pt, Pt] | null = null
  /** twist accumulated before rotation engages */
  private twist = 0
  private rotating = false
  private downAt = 0
  private moved = false
  private mode: 'none' | 'pan' | 'decide' | 'tilt' | 'two' = 'none'
  private lastTap: { t: number; x: number; y: number } | null = null
  private velocity = new THREE.Vector3()
  private lastMoveT = 0
  private ray = new THREE.Raycaster()
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private ndc = new THREE.Vector2()
  private tmpA = new THREE.Vector3()
  private tmpB = new THREE.Vector3()

  constructor(
    private host: HTMLElement,
    private canvas: HTMLCanvasElement,
    private camera: THREE.PerspectiveCamera,
    private controls: MapControls,
    private hooks: TouchHooks
  ) {
    // capture phase on the parent: touch never reaches MapControls' own listeners on the canvas
    host.addEventListener('pointerdown', this.onDown, { capture: true })
    host.addEventListener('pointermove', this.onMove, { capture: true })
    host.addEventListener('pointerup', this.onUp, { capture: true })
    host.addEventListener('pointercancel', this.onUp, { capture: true })
    // older iOS Safari zooms the page on pinch unless its gesture events are cancelled
    canvas.addEventListener('gesturestart', this.preventDefault)
    canvas.addEventListener('gesturechange', this.preventDefault)
  }

  get active() {
    return this.pts.size > 0
  }

  // ───────────── helpers ─────────────
  private preventDefault = (e: Event) => e.preventDefault()

  private ground(p: Pt, out: THREE.Vector3) {
    const r = this.canvas.getBoundingClientRect()
    this.ndc.set(((p.x - r.left) / r.width) * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(this.ndc, this.camera)
    return this.ray.ray.intersectPlane(this.plane, out)
  }

  private move(delta: THREE.Vector3) {
    this.camera.position.add(delta)
    this.controls.target.add(delta)
  }

  private both(): [Pt, Pt] {
    const [a, b] = [...this.pts.values()]
    return [{ ...a }, { ...b }]
  }

  /** (re)start a two-finger gesture from the fingers' current positions */
  private beginPair() {
    this.mode = 'decide'
    for (const [id, q] of this.pts) this.start.set(id, { ...q })
    this.pair = this.both()
    this.twist = 0
    this.rotating = false
  }

  // ───────────── events ─────────────
  private onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || e.target !== this.canvas) return
    e.stopPropagation()
    e.preventDefault()
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // pointer already gone (very fast tap): nothing to capture
    }
    if (this.pts.size === 0) {
      this.downAt = e.timeStamp
      this.moved = false
      this.hooks.onStart()
    }
    this.velocity.set(0, 0, 0)
    const p = { x: e.clientX, y: e.clientY }
    this.pts.set(e.pointerId, p)
    this.start.set(e.pointerId, { ...p })
    if (this.pts.size === 1) this.mode = 'pan'
    else {
      // a second finger never ends in a tap, however short the touch
      this.moved = true
      if (this.pts.size === 2) this.beginPair()
      else this.mode = 'none' // 3+ fingers: ignored until back to two
    }
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !this.pts.has(e.pointerId)) return
    e.stopPropagation()
    const prev = this.pts.get(e.pointerId)!
    const cur = { x: e.clientX, y: e.clientY }
    const s = this.start.get(e.pointerId)!
    if (Math.hypot(cur.x - s.x, cur.y - s.y) > TAP_SLOP) this.moved = true
    this.pts.set(e.pointerId, cur)
    // two-finger gestures are evaluated once per frame in update()
    if (this.pts.size !== 1 || this.mode !== 'pan') return

    const a = this.ground(prev, this.tmpA)
    const b = this.ground(cur, this.tmpB)
    if (!a || !b) return
    const d = a.sub(b)
    // keep a far-horizon drag from flinging the camera across the map
    const lim = this.camera.position.distanceTo(this.controls.target) * 0.5
    if (d.length() > lim) d.setLength(lim)
    this.move(d)
    const dt = Math.max(e.timeStamp - this.lastMoveT, 1)
    this.velocity.lerp(d.clone().divideScalar(dt), 0.6)
    this.lastMoveT = e.timeStamp
  }

  private onUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !this.pts.has(e.pointerId)) return
    e.stopPropagation()
    this.pts.delete(e.pointerId)
    this.start.delete(e.pointerId)
    try {
      this.canvas.releasePointerCapture(e.pointerId)
    } catch {
      // already released by the browser
    }
    if (this.pts.size === 2) {
      // three fingers down to two: carry on as a fresh two-finger gesture
      this.beginPair()
      return
    }
    if (this.pts.size === 1) {
      // lifting one of two fingers: continue as a one-finger drag from where the other one is
      this.mode = 'pan'
      this.pair = null
      for (const [id, q] of this.pts) this.start.set(id, { ...q })
      this.velocity.set(0, 0, 0)
      return
    }
    if (this.pts.size > 0) return
    const wasPan = this.mode === 'pan'
    this.mode = 'none'
    this.pair = null
    const quick = e.timeStamp - this.downAt < TAP_MAX_MS
    if (!this.moved && quick && e.type === 'pointerup') {
      const now = e.timeStamp
      if (this.lastTap && now - this.lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 30) {
        this.lastTap = null
        this.hooks.onDoubleTap(e.clientX, e.clientY)
      } else {
        this.lastTap = { t: now, x: e.clientX, y: e.clientY }
        this.hooks.onTap(e.clientX, e.clientY)
      }
      this.velocity.set(0, 0, 0)
      return
    }
    // fling: only if the finger was still moving when it lifted
    if (!wasPan || e.timeStamp - this.lastMoveT > 80) this.velocity.set(0, 0, 0)
  }

  // ───────────── per-frame ─────────────
  /** two-finger gesture step from the last processed positions to the current ones */
  private stepPair() {
    if (!this.pair) return
    const [p0, p1] = this.pair
    const [n0, n1] = this.both()
    if (p0.x === n0.x && p0.y === n0.y && p1.x === n1.x && p1.y === n1.y) return

    if (this.mode === 'decide') {
      const ids = [...this.pts.keys()]
      const s0 = this.start.get(ids[0])!, s1 = this.start.get(ids[1])!
      const d0 = { x: n0.x - s0.x, y: n0.y - s0.y }, d1 = { x: n1.x - s1.x, y: n1.y - s1.y }
      const t0 = Math.hypot(d0.x, d0.y), t1 = Math.hypot(d1.x, d1.y)
      if (Math.max(t0, t1) < 8) return
      // one finger has barely moved yet: wait a little before telling a swipe from a pinch
      if (Math.min(t0, t1) < 5 && Math.max(t0, t1) < 24) return
      const spread0 = Math.hypot(s1.x - s0.x, s1.y - s0.y), spread1 = Math.hypot(n1.x - n0.x, n1.y - n0.y)
      const vertical = Math.abs(d0.y) > Math.abs(d0.x) * 1.4 && Math.abs(d1.y) > Math.abs(d1.x) * 1.4
      const together = Math.sign(d0.y) === Math.sign(d1.y)
      this.mode = vertical && together && Math.abs(spread1 - spread0) < 18 ? 'tilt' : 'two'
      // fall through: the movement made while deciding is applied now, so the map stays under the fingers
    }

    if (this.mode === 'tilt') {
      const dy = (n0.y + n1.y) / 2 - (p0.y + p1.y) / 2
      const offset = this.camera.position.clone().sub(this.controls.target)
      const sph = new THREE.Spherical().setFromVector3(offset)
      // swipe up = look towards the horizon (Google Maps convention)
      sph.phi = THREE.MathUtils.clamp(sph.phi - dy * TILT_PER_PX, this.hooks.minPolar, this.hooks.maxPolar())
      sph.makeSafe()
      this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(sph))
      this.pair = [n0, n1]
      return
    }

    if (this.mode !== 'two') {
      this.pair = [n0, n1]
      return
    }
    // zoom about the fingers, twist to rotate, move the midpoint to pan
    const pm = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
    const nm = { x: (n0.x + n1.x) / 2, y: (n0.y + n1.y) / 2 }
    const anchor = this.ground(pm, new THREE.Vector3())
    this.pair = [n0, n1]
    if (!anchor) return
    const distPrev = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const distNow = Math.hypot(n1.x - n0.x, n1.y - n0.y)
    if (distPrev > 1 && distNow > 1) {
      let factor = distPrev / distNow
      const camDist = this.camera.position.distanceTo(this.controls.target)
      const next = THREE.MathUtils.clamp(camDist * factor, this.hooks.minDistance, this.hooks.maxDistance())
      factor = next / camDist
      this.camera.position.sub(anchor).multiplyScalar(factor).add(anchor)
      this.controls.target.sub(anchor).multiplyScalar(factor).add(anchor)
    }
    let dAng = Math.atan2(n1.y - n0.y, n1.x - n0.x) - Math.atan2(p1.y - p0.y, p1.x - p0.x)
    dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng))
    if (!this.rotating) {
      // rotation engages after a deliberate twist, then catches up with the whole twist at once
      this.twist += dAng
      if (Math.abs(this.twist) > ROTATE_THRESHOLD) {
        this.rotating = true
        dAng = this.twist
      } else dAng = 0
    }
    if (Math.abs(dAng) > 1e-4) {
      // the map turns with the fingers: orbit the camera the same way about the anchor
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dAng)
      this.camera.position.sub(anchor).applyQuaternion(q).add(anchor)
      this.controls.target.sub(anchor).applyQuaternion(q).add(anchor)
      this.camera.lookAt(this.controls.target)
    }
    this.camera.updateMatrixWorld()
    const a = this.ground(pm, this.tmpA)
    const b = this.ground(nm, this.tmpB)
    if (a && b) this.move(a.sub(b))
  }

  /** two-finger gestures + momentum after a fling; call every frame before controls.update() */
  update(dtSeconds: number) {
    if (this.pts.size === 2) this.stepPair()
    if (this.active || this.velocity.lengthSq() < 1e-8) return
    const ms = dtSeconds * 1000
    this.move(this.tmpA.copy(this.velocity).multiplyScalar(ms))
    this.velocity.multiplyScalar(Math.pow(0.0025, dtSeconds)) // ~0.3 s glide
  }

  stopMomentum() {
    this.velocity.set(0, 0, 0)
  }

  dispose() {
    this.host.removeEventListener('pointerdown', this.onDown, { capture: true })
    this.host.removeEventListener('pointermove', this.onMove, { capture: true })
    this.host.removeEventListener('pointerup', this.onUp, { capture: true })
    this.host.removeEventListener('pointercancel', this.onUp, { capture: true })
    this.canvas.removeEventListener('gesturestart', this.preventDefault)
    this.canvas.removeEventListener('gesturechange', this.preventDefault)
  }
}
