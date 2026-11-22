'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { LayoutScene, type OverlayItem, type PlotVisual, type Quality, type SceneMode } from './LayoutScene'
import { LANDMARK_COLORS } from './region'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  googleMapsLink,
  latLonToWorld,
  resolvePlotStatus,
  worldToLatLon,
  type ContextLabel,
  type LayoutDataset,
  type LayoutPlot,
  type LayoutProjectConfig,
  type PlotCategory,
  type PlotStatus,
  type RegionDataset,
} from '@/lib/layout3d/types'

// Lead-capture download (same flow as the project page); loads on first use
const DownloadPopup = dynamic(() => import('@/components/ui/DownloadPopup').then((m) => m.DownloadPopup), { ssr: false })

type ColorMode = 'layout' | 'status'
type StatusFilter = 'all' | PlotStatus
type MenuKey = 'aerial' | 'plot' | 'project' | 'nearby' | 'rings'

interface Props {
  project: LayoutProjectConfig
  backHref?: string
}

const GLASS = 'bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/30'
/** Bottom offset on phones: drawers and buttons sit above the menu strip */
const ABOVE_STRIP = 'bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+3.4rem)] desk:bottom-[max(0.75rem,env(safe-area-inset-bottom))]'

const MENU: Array<{ key: MenuKey; label: string; short: string; color: string }> = [
  { key: 'aerial', label: 'Aerial 360° View', short: 'Aerial 360°', color: '#3b82f6' },
  { key: 'plot', label: 'Plot Details', short: 'Plots', color: '#22c55e' },
  { key: 'project', label: 'Project Details', short: 'Project', color: '#f59e0b' },
  { key: 'nearby', label: 'Nearby Locations', short: 'Nearby', color: '#a855f7' },
  { key: 'rings', label: 'ORR & RRR', short: 'ORR & RRR', color: '#f43f5e' },
]

function inkFor(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? '#ffffff' : '#2a2622'
}

function bboxOf(plots: LayoutPlot[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of plots)
    for (let i = 0; i < p.p.length; i += 2) {
      x0 = Math.min(x0, p.p[i]); x1 = Math.max(x1, p.p[i])
      y0 = Math.min(y0, p.p[i + 1]); y1 = Math.max(y1, p.p[i + 1])
    }
  return { x0, y0, x1, y1 }
}

function centreOf(plot: LayoutPlot) {
  let x = 0, y = 0
  const n = plot.p.length / 2
  for (let i = 0; i < plot.p.length; i += 2) { x += plot.p[i]; y += plot.p[i + 1] }
  return { x: x / n, y: y / n }
}

/** Phones, tablets and low-end machines get the lighter rendering tier. */
function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const small = Math.min(window.innerWidth, window.innerHeight) < 600
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4
  return small || coarse || weak ? 'low' : 'high'
}

const PLACE_PRIORITY: Record<string, number> = { town: 52, suburb: 45, village: 42, hamlet: 32, college: 56, university: 56, hospital: 50, townhall: 50 }

export function LayoutTwinViewer({ project, backHref = '/projects/vian-vally' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<LayoutScene | null>(null)
  // DOM registry for the HTML pins (stable across renders; written by callback refs)
  const [overlayEls] = useState(() => new Map<string, HTMLDivElement>())
  const compassRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<LayoutDataset | null>(null)
  const [region, setRegion] = useState<RegionDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contextLost, setContextLost] = useState(false)
  const [sceneKey, setSceneKey] = useState(0)
  const [ready, setReady] = useState(false)
  // Default view: availability colours (available green, booked amber, sold red)
  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [venture, setVenture] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [menu, setMenu] = useState<MenuKey>('aerial')
  /** which side panel is open (separate from the active menu item so panels can be closed) */
  const [panel, setPanel] = useState<MenuKey | null>(null)
  const [sceneMode, setSceneMode] = useState<SceneMode>('site')
  const [legendOpen, setLegendOpen] = useState(false)
  const [download, setDownload] = useState<{ urls: string[]; documentType: string } | null>(null)

  // ── data ───────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    fetch(project.datasetUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Layout data ${r.status}`)
        return r.json() as Promise<LayoutDataset>
      })
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Failed to load layout'))
    if (project.regionUrl) {
      fetch(project.regionUrl)
        .then((r) => (r.ok ? (r.json() as Promise<RegionDataset>) : null))
        .then((d) => alive && d && setRegion(d))
        .catch(() => undefined) // regional views are optional
    }
    return () => {
      alive = false
    }
  }, [project.datasetUrl, project.regionUrl])

  const plotById = useMemo(() => new Map((data?.plots ?? []).map((p) => [p.id, p])), [data])
  const statusOf = useCallback((id: string) => resolvePlotStatus(id, project.inventory), [project.inventory])
  const ventureName = useCallback((key: string) => project.ventures.find((v) => v.key === key)?.name ?? key, [project.ventures])
  const ventureBoxes = useMemo(() => {
    const m = new Map<string, ReturnType<typeof bboxOf>>()
    if (!data) return m
    m.set('all', bboxOf(data.plots))
    for (const v of project.ventures) m.set(v.key, bboxOf(data.plots.filter((p) => p.v === v.key)))
    return m
  }, [data, project.ventures])

  const scopePlots = useMemo(() => (data ? (venture === 'all' ? data.plots : data.plots.filter((p) => p.v === venture)) : []), [data, venture])
  const counts = useMemo(() => {
    const c = { available: 0, booked: 0, sold: 0, total: scopePlots.length }
    for (const p of scopePlots) c[statusOf(p.id)]++
    return c
  }, [scopePlots, statusOf])

  // ── scene lifecycle ────────────────────────────────────
  useEffect(() => {
    if (!data || !containerRef.current || !canvasRef.current) return
    let scene: LayoutScene
    try {
      scene = new LayoutScene(
        containerRef.current,
        canvasRef.current,
        data,
        {
          onHover: (id, x, y) => setHover(id ? { id, x, y } : null),
          onSelect: (id) => {
            if (!id) return
            setSelectedId(id)
            setPanel(null)
          },
          onAzimuth: (deg) => {
            if (compassRef.current) compassRef.current.style.transform = `rotate(${deg}deg)`
          },
          onReady: () => setReady(true),
          onContextLost: () => setContextLost(true),
        },
        { quality: detectQuality(), reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches }
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : 'WebGL is not available on this device'
      queueMicrotask(() => setError(message))
      return
    }
    sceneRef.current = scene
    const vv1 = project.ventures[0]?.key
    const b = (vv1 && ventureBoxes.get(vv1)) || ventureBoxes.get('all')
    if (b) scene.intro(b.x0, b.y0, b.x1, b.y1)
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
    // ventureBoxes derives from data; the scene is rebuilt only for a new dataset or after a GPU reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sceneKey])

  useEffect(() => {
    if (ready && region) sceneRef.current?.setRegion(region)
  }, [ready, region, sceneKey])

  // Keep the 3D framing (and the available-plot pins) inside the area not covered by the menus
  useEffect(() => {
    const root = containerRef.current
    if (!ready || !root) return
    const measure = () => {
      const scene = sceneRef.current
      if (!scene) return
      const box = root.getBoundingClientRect()
      const el = (k: string) => {
        const e = root.querySelector<HTMLElement>(`[data-inset="${k}"]`)
        if (!e || getComputedStyle(e).display === 'none') return null
        return e.getBoundingClientRect()
      }
      const top = el('top'), right = el('right'), bottom = el('bottom')
      // phone layout: the tool dock sits on the right edge (on desktop it is a small bottom bar)
      const tools = bottom ? el('tools') : null
      // the top bar is a full-width strip; its real height is its content
      const topBottom = top ? Math.max(...[...root.querySelectorAll<HTMLElement>('[data-inset="top"] [data-ui-chrome]')].map((c) => c.getBoundingClientRect().bottom), top.top) : box.top
      scene.setInsets({
        top: topBottom - box.top + 6,
        right: right ? box.right - right.left + 8 : tools ? box.right - tools.left + 6 : 0,
        bottom: bottom ? box.bottom - bottom.top + 6 : 0,
        left: 0,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    const top = root.querySelector('[data-inset="top"]')
    if (top) ro.observe(top)
    return () => ro.disconnect()
  }, [ready, sceneKey])

  // ── plot colours ───────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !data || !ready) return
    const visuals: PlotVisual[] = data.plots.map((p) => {
      const st = statusOf(p.id)
      // Available plots are always highlighted, whichever colour mode is active
      const color = colorMode === 'status' || st === 'available' ? STATUS_COLORS[st] : CATEGORY_COLORS[p.cat]
      return { color, ink: inkFor(color), dimmed: statusFilter !== 'all' && st !== statusFilter }
    })
    scene.setVisuals(visuals)
  }, [data, ready, colorMode, statusFilter, statusOf, sceneKey])

  // ── selection ──────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready) return
    scene.setSelected(selectedId)
    if (selectedId) {
      if (scene.getMode() !== 'site') scene.setMode('site', false)
      scene.flyToPlot(selectedId)
    }
  }, [selectedId, ready, sceneKey])

  // ── labels & pins (crisp HTML, positioned and decluttered by the engine each frame) ──
  const availablePins = useMemo(() => (data ? data.plots.filter((p) => statusOf(p.id) === 'available') : []), [data, statusOf])
  const annotationAnchors = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    if (!data) return m
    for (const a of project.annotations) {
      if (a.venture) {
        const b = ventureBoxes.get(a.venture)
        if (b && Number.isFinite(b.x0)) m.set(a.id, { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })
      } else if (a.lat != null && a.lon != null && data.geo) {
        m.set(a.id, latLonToWorld(data.geo, a.lat, a.lon))
      }
    }
    return m
  }, [data, project.annotations, ventureBoxes])
  const contextLabels: ContextLabel[] = useMemo(() => (data?.context ? [...data.context.places, ...data.context.amenities] : []), [data])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !ready || !data) return
    const items: OverlayItem[] = []
    const ref = (k: string) => overlayEls.get(k)
    if (sceneMode === 'site') {
      if (showLabels) {
        for (const a of project.annotations) {
          const el = ref(`a:${a.id}`)
          const at = annotationAnchors.get(a.id)
          if (!el || !at) continue
          const priority = a.kind === 'venture' ? 90 : a.kind === 'amenity' ? 70 : a.kind === 'direction' ? 60 : 55
          items.push({ el, x: at.x, y: at.y, lift: a.kind === 'venture' ? 18 : 6, priority, hideNear: a.kind === 'venture' ? 160 : undefined })
        }
        contextLabels.forEach((l, i) => {
          const el = ref(`c:${i}`)
          if (el) items.push({ el, x: l.x, y: l.y, lift: 4, priority: PLACE_PRIORITY[l.k] ?? 35, hideNear: 120 })
        })
      }
      for (const p of availablePins) {
        const el = ref(`p:${p.id}`)
        if (!el) continue
        const c = centreOf(p)
        // always on screen from any zoom (only hidden up close, where the green plot shows its own number)
        items.push({ el, x: c.x, y: c.y, lift: 3, priority: 100, hideNear: 230, sticky: true })
      }
    } else if (region) {
      const pin = (key: string, lat: number, lon: number, priority: number, lift = 0) => {
        const el = ref(key)
        if (!el) return
        const at = scene.latLonToData(lat, lon)
        items.push({ el, x: at.x, y: at.y, lift, priority })
      }
      pin('r:project', region.project.lat, region.project.lon, 200, sceneMode === 'rings' ? 6000 : 2600)
      if (sceneMode === 'nearby') region.landmarks.forEach((l, i) => pin(`r:lm:${i}`, l.lat, l.lon, 120 - i, 1300))
      if (sceneMode === 'rings') {
        region.cities.forEach((c, i) => pin(`r:city:${i}`, c.lat, c.lon, c.k === 'city' ? 110 : 60))
        pin('r:orr', 17.2183, 78.3823, 150) // ORR point nearest the project
        const n = region.rrr.north[0]
        if (n) pin('r:rrr', n[Math.floor(n.length / 2)][0], n[Math.floor(n.length / 2)][1], 140)
        const s = region.rrr.southIndicative
        pin('r:rrr-s', s[Math.floor(s.length / 2)][0], s[Math.floor(s.length / 2)][1], 130)
      }
    }
    scene.setOverlay(items)
  }, [ready, data, region, sceneMode, showLabels, availablePins, project.annotations, annotationAnchors, contextLabels, sceneKey, overlayEls])

  // ── actions ────────────────────────────────────────────
  const toSite = useCallback(() => {
    const scene = sceneRef.current
    if (scene && scene.getMode() !== 'site') scene.setMode('site', false)
    setSceneMode('site')
  }, [])

  const goVenture = useCallback(
    (key: string) => {
      setVenture(key)
      toSite()
      const b = ventureBoxes.get(key)
      if (b && sceneRef.current) sceneRef.current.flyToBox(b.x0, b.y0, b.x1, b.y1, { polar: 0.7 })
    },
    [ventureBoxes, toSite]
  )

  const onMenu = (key: MenuKey) => {
    const scene = sceneRef.current
    setMenu(key)
    setHover(null)
    if (key === 'aerial') {
      setPanel(null)
      setSelectedId(null)
      const b = ventureBoxes.get(venture) ?? ventureBoxes.get('all')
      setSceneMode('site')
      if (b && scene) scene.aerialTour(b.x0, b.y0, b.x1, b.y1)
      return
    }
    if (key === 'nearby' || key === 'rings') {
      setSelectedId(null)
      setPanel(key)
      const mode: SceneMode = key === 'nearby' ? 'nearby' : 'rings'
      setSceneMode(mode)
      scene?.setMode(mode)
      return
    }
    // plot / project details live on the site view
    if (sceneMode !== 'site') {
      toSite()
      const b = ventureBoxes.get(venture) ?? ventureBoxes.get('all')
      if (b && scene) scene.flyToBox(b.x0, b.y0, b.x1, b.y1, { polar: 0.7 })
    }
    if (key === 'project') setSelectedId(null)
    setPanel(key)
  }

  const results = useMemo(() => {
    const q = query.trim().replace(/^0+(?=\d)/, '')
    if (!q || !data) return []
    return data.plots
      .filter((p) => (venture === 'all' || p.v === venture) && p.n.replace(/^0+(?=\d)/, '').startsWith(q))
      .sort((a, b) => a.n.length - b.n.length || Number(a.n) - Number(b.n))
      .slice(0, 8)
  }, [query, data, venture])

  const selectPlot = (id: string) => {
    setSelectedId(id)
    setSearchOpen(false)
    setPanel(null)
    setMenu('plot')
    setSceneMode('site')
  }

  const restart3D = () => {
    setContextLost(false)
    setReady(false)
    setSceneMode('site')
    setSceneKey((k) => k + 1)
  }

  const selected = selectedId ? plotById.get(selectedId) ?? null : null
  const selectedStatus = selected ? statusOf(selected.id) : null
  const hovered = hover ? plotById.get(hover.id) ?? null : null
  const details = selected ? project.plotDetails?.[selected.id] : undefined
  const selectedLatLon = selected && data?.geo ? worldToLatLon(data.geo, centreOf(selected).x, centreOf(selected).y) : null
  const hasBrochure = (project.brochureUrls?.length ?? 0) > 0

  const whatsappHref = selected
    ? `https://wa.me/${project.whatsappNumber}?text=${encodeURIComponent(
        `Hi Bhuwanta, I'm interested in Plot ${selected.n} at ${ventureName(selected.v)}, ${project.projectName} (${project.location})` +
          (details ? ` – ${details.facing} facing, ${details.sizeSqYds} sq. yds (${details.dimensions})` : '') +
          '. Please share the price and availability.'
      )}`
    : `https://wa.me/${project.whatsappNumber}`

  const legend: Array<{ key: string; label: string; color: string }> =
    colorMode === 'status'
      ? (Object.keys(STATUS_COLORS) as PlotStatus[]).map((k) => ({ key: k, label: STATUS_LABELS[k], color: STATUS_COLORS[k] }))
      : (Object.keys(CATEGORY_COLORS) as PlotCategory[]).map((k) => ({ key: k, label: CATEGORY_LABELS[k], color: CATEGORY_COLORS[k] }))

  const setRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) overlayEls.set(key, el)
    else overlayEls.delete(key)
  }
  const drawerCls = `absolute inset-x-3 ${ABOVE_STRIP} z-40 max-h-[58dvh] overflow-y-auto overscroll-contain rounded-3xl p-5 desk:inset-x-auto desk:bottom-auto desk:left-4 desk:top-24 desk:max-h-[calc(100dvh-7.5rem)] desk:w-80 ${GLASS}`
  const showPlotPanel = panel === 'plot' && !selected
  const showSoldCard = Boolean(selected && selectedStatus && selectedStatus !== 'available')
  const showPlotCard = Boolean(selected && selectedStatus === 'available')

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#dce8ef] select-none text-slate-100">
      <canvas ref={canvasRef} key={sceneKey} className="absolute inset-0 h-full w-full touch-none outline-none" />

      {/* ───────────── Labels & pins ───────────── */}
      <div className="pointer-events-none absolute inset-0">
        {project.annotations.map((a) => (
          <div key={a.id} ref={setRef(`a:${a.id}`)} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
            {a.kind === 'venture' ? (
              <div className="flex flex-col items-center">
                <div className="rounded-xl border border-amber-300/50 bg-slate-950/85 px-3 py-1.5 text-center shadow-lg backdrop-blur">
                  <div className="whitespace-nowrap text-[13px] font-extrabold tracking-wide text-white">{a.label}</div>
                  {a.sublabel && <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">{a.sublabel}</div>}
                </div>
                <div className="h-5 w-px bg-amber-300/80" />
                <div className="h-2 w-2 rounded-full bg-amber-300 ring-4 ring-amber-300/30" />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md ${
                    a.kind === 'amenity' ? 'bg-rose-600 text-white' : a.kind === 'direction' ? 'bg-white/95 text-slate-800' : 'bg-amber-300 text-slate-900'
                  }`}
                >
                  {a.kind === 'direction' && <Navigation className="mr-1 inline h-3 w-3 -translate-y-px" />}
                  {a.label}
                  {a.sublabel && <span className="ml-1 font-medium opacity-80">· {a.sublabel}</span>}
                </div>
                <div className="h-2.5 w-px bg-slate-900/50" />
              </div>
            )}
          </div>
        ))}
        {contextLabels.map((l, i) => (
          <div key={`c${i}`} ref={setRef(`c:${i}`)} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
            <div
              className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold shadow-sm ${
                l.k === 'town'
                  ? 'bg-white/90 text-[13px] text-slate-900'
                  : l.k === 'village' || l.k === 'hamlet' || l.k === 'suburb'
                    ? 'bg-white/75 text-[11px] text-slate-700'
                    : 'bg-sky-100/95 text-[11px] text-sky-900'
              }`}
            >
              {l.n}
            </div>
          </div>
        ))}
        {availablePins.map((p) => (
          <div key={p.id} ref={setRef(`p:${p.id}`)} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
            <button type="button" onClick={() => selectPlot(p.id)} className="pointer-events-auto flex flex-col items-center p-1 in-data-[far=true]:p-0.5" aria-label={`Available plot ${p.n}`}>
              <span className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-lg ring-2 ring-white in-data-[far=true]:rounded-md in-data-[far=true]:px-1.5 in-data-[far=true]:py-0 in-data-[far=true]:text-[10px] in-data-[far=true]:ring-1">
                {p.n}
              </span>
              <span className="relative mt-0.5 flex h-2.5 w-2.5 in-data-[far=true]:h-2 in-data-[far=true]:w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
            </button>
          </div>
        ))}

        {/* Regional pins */}
        {region && (
          <>
            <div ref={setRef('r:project')} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
              <div className="whitespace-nowrap rounded-xl border border-amber-300/60 bg-slate-950/90 px-3 py-1.5 text-center shadow-xl">
                <div className="text-[13px] font-black text-white">{project.projectName}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">{project.location.split(',')[0]}</div>
              </div>
            </div>
            {region.landmarks.map((l, i) => (
              <div key={l.n} ref={setRef(`r:lm:${i}`)} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
                <div className="whitespace-nowrap rounded-xl bg-white/95 px-2.5 py-1 text-slate-900 shadow-lg" style={{ borderLeft: `4px solid ${LANDMARK_COLORS[l.k] ?? '#fbbf24'}` }}>
                  <div className="text-[11px] font-extrabold">{l.n}</div>
                  {l.km != null && (
                    <div className="text-[10px] font-semibold text-slate-500">
                      {l.km} km · ~{l.min} min
                    </div>
                  )}
                </div>
              </div>
            ))}
            {region.cities.map((c, i) => (
              <div key={c.n} ref={setRef(`r:city:${i}`)} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
                <div className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold shadow ${c.k === 'city' ? 'bg-slate-900/90 text-[13px] text-white' : 'bg-white/85 text-[11px] text-slate-700'}`}>
                  {c.n}
                </div>
              </div>
            ))}
            <div ref={setRef('r:orr')} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
              <div className="whitespace-nowrap rounded-full bg-cyan-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-lg">ORR · {region.orr.aerialKm} km away</div>
            </div>
            <div ref={setRef('r:rrr')} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
              <div className="whitespace-nowrap rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-lg">RRR (proposed)</div>
            </div>
            <div ref={setRef('r:rrr-s')} style={{ visibility: 'hidden' }} className="absolute left-0 top-0 will-change-transform">
              <div className="whitespace-nowrap rounded-full border border-orange-500 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-orange-700 shadow">RRR south · indicative</div>
            </div>
          </>
        )}
      </div>

      {/* Hover tooltip (mouse only) */}
      {hovered && hover && hover.id !== selectedId && sceneMode === 'site' && (
        <div className={`pointer-events-none absolute z-20 rounded-lg px-3 py-2 text-xs ${GLASS}`} style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="font-extrabold text-white">Plot {hovered.n}</div>
          {statusOf(hovered.id) === 'available' ? (
            <div className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
              {project.plotDetails?.[hovered.id] && (
                <span className="text-slate-300">
                  · {project.plotDetails[hovered.id].sizeSqYds} sq. yds · {project.plotDetails[hovered.id].facing}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-0.5 flex items-center gap-1.5 font-semibold" style={{ color: STATUS_COLORS[statusOf(hovered.id)] }}>
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[statusOf(hovered.id)] }} /> {STATUS_LABELS[statusOf(hovered.id)]}
            </div>
          )}
        </div>
      )}

      {/* ───────────── Top bar ───────────── */}
      <div data-inset="top" className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-wrap items-start gap-2 desk:pr-64">
          <div data-ui-chrome className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-1.5 py-1.5 sm:px-3 sm:py-2 ${GLASS}`}>
            <Link href={backHref} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Back to project">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="hidden leading-tight sm:block [@media(max-height:500px)]:hidden">
              <div className="text-sm font-extrabold tracking-wide">{project.projectName}</div>
              <div className="text-[11px] text-slate-400">{project.location}</div>
            </div>
          </div>

          <div data-ui-chrome className={`pointer-events-auto flex min-w-0 max-w-[calc(100%-3.5rem)] items-center gap-1 overflow-x-auto rounded-2xl p-1 sm:max-w-none ${GLASS}`}>
            {[{ key: 'all', shortName: 'All' }, ...project.ventures].map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => goVenture(v.key)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition ${venture === v.key ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {v.shortName}
              </button>
            ))}
          </div>

          <div data-ui-chrome className="pointer-events-auto relative w-full sm:w-64 [@media(max-height:500px)]:w-44">
            <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${GLASS}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                inputMode="numeric"
                enterKeyHint="search"
                onChange={(e) => {
                  setQuery(e.target.value.replace(/[^\d]/g, ''))
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) {
                    selectPlot(results[0].id)
                    ;(e.target as HTMLInputElement).blur()
                  }
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
                placeholder="Search plot number"
                className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none sm:text-sm"
                aria-label="Search plot number"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="-m-1 p-1">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            {searchOpen && query && (
              <div className={`absolute mt-2 max-h-[45vh] w-full overflow-y-auto rounded-2xl ${GLASS}`}>
                {results.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-slate-400">No plot {query} {venture !== 'all' && `in ${ventureName(venture)}`}</div>
                ) : (
                  results.map((p) => (
                    <button key={p.id} type="button" onClick={() => selectPlot(p.id)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-white/10">
                      <span className="font-bold">Plot {p.n}</span>
                      <span className="flex items-center gap-2 text-[11px] text-slate-400">
                        {ventureName(p.v)}
                        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[statusOf(p.id)] }} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div data-ui-chrome className={`pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl p-1 ${GLASS}`}>
            {(['available', 'booked', 'sold'] as PlotStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter((f) => (f === s ? 'all' : s))}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-1.5 text-[11px] font-bold transition sm:px-2.5 sm:text-xs ${
                  statusFilter === s ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'
                }`}
                aria-pressed={statusFilter === s}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                {STATUS_LABELS[s]} <span className="tabular-nums opacity-70">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────── Main menu: numbered list (desktop) / strip (phone) ───────────── */}
      <nav data-ui-chrome data-inset="right" aria-label="Layout views" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-30 hidden w-60 flex-col gap-2 desk:flex">
        {MENU.map((m, i) => (
          <MenuPill key={m.key} n={i + 1} label={m.label} color={m.color} active={menu === m.key} onClick={() => onMenu(m.key)} />
        ))}
        <MenuPill n={MENU.length + 1} label="View in Google Maps" color="#6366f1" href={project.googleMapsUrl} />
        {hasBrochure && (
          <MenuPill
            icon={<Download className="h-3.5 w-3.5" />}
            label="Download Brochure"
            color="#3b82f6"
            onClick={() => setDownload({ urls: project.brochureUrls ?? [], documentType: 'Brochure' })}
          />
        )}
      </nav>
      <nav
        data-ui-chrome
        data-inset="bottom"
        aria-label="Layout views"
        className="absolute inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 flex gap-1.5 overflow-x-auto px-3 desk:hidden [scrollbar-width:none]"
      >
        {MENU.map((m, i) => (
          <MenuChip key={m.key} n={i + 1} label={m.short} color={m.color} active={menu === m.key} onClick={() => onMenu(m.key)} />
        ))}
        <MenuChip n={MENU.length + 1} label="Maps" color="#6366f1" href={project.googleMapsUrl} />
        {hasBrochure && (
          <MenuChip
            icon={<Download className="h-3 w-3" />}
            label="Brochure"
            color="#3b82f6"
            onClick={() => setDownload({ urls: project.brochureUrls ?? [], documentType: 'Brochure' })}
          />
        )}
      </nav>

      {/* ───────────── Tools ───────────── */}
      <div
        data-ui-chrome
        data-inset="tools"
        className={`absolute right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-2xl p-1.5 desk:bottom-[max(0.75rem,env(safe-area-inset-bottom))] desk:right-20 desk:top-auto desk:translate-y-0 desk:flex-row ${GLASS}`}
      >
        <ToolButton label="Top view" onClick={() => sceneRef.current?.topView()} icon={<Square className="h-4 w-4" />} />
        <ToolButton
          label={colorMode === 'status' ? 'Show plot types (brochure colours)' : 'Show availability (sold in red)'}
          active={colorMode === 'layout'}
          onClick={() => setColorMode((m) => (m === 'layout' ? 'status' : 'layout'))}
          icon={<Layers className="h-4 w-4" />}
        />
        <ToolButton
          label={showLabels ? 'Hide labels' : 'Show labels'}
          active={showLabels}
          onClick={() => setShowLabels((v) => !v)}
          icon={showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        />
        <span className="hidden desk:contents">
          <ToolButton label="Zoom in" onClick={() => sceneRef.current?.zoomBy(0.6)} icon={<ZoomIn className="h-4 w-4" />} />
          <ToolButton label="Zoom out" onClick={() => sceneRef.current?.zoomBy(1.6)} icon={<ZoomOut className="h-4 w-4" />} />
        </span>
      </div>

      {/* Legend: always visible on desktop, tap-to-open on phones */}
      {sceneMode === 'site' && !showPlotCard && !panel && (
        <div data-ui-chrome className={`absolute ${ABOVE_STRIP} left-[max(0.75rem,env(safe-area-inset-left))] z-20 flex flex-col items-start`}>
          <div className={`${legendOpen ? 'mb-2 block' : 'hidden'} rounded-2xl px-3 py-2.5 desk:mb-0 desk:block ${GLASS}`}>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{colorMode === 'status' ? 'Availability' : 'Plot types'}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {legend.map((l) => (
                <div key={l.key} className="flex items-center gap-2 text-[11px] text-slate-200">
                  <span className="h-3 w-3 rounded-sm border border-black/30" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
              {colorMode === 'layout' && (
                <div className="flex items-center gap-2 text-[11px] text-slate-200">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white/80" />
                  Available now
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold desk:hidden ${GLASS}`}
            aria-expanded={legendOpen}
          >
            <span className="flex -space-x-1">
              {legend.slice(0, 3).map((l) => (
                <span key={l.key} className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-900" style={{ background: l.color }} />
              ))}
            </span>
            Legend
          </button>
        </div>
      )}

      {/* Compass */}
      <button
        data-ui-chrome
        type="button"
        onClick={() => sceneRef.current?.resetNorth()}
        className={`absolute ${ABOVE_STRIP} right-[max(0.75rem,env(safe-area-inset-right))] z-20 grid h-12 w-12 place-items-center rounded-full desk:right-4 desk:h-14 desk:w-14 ${GLASS}`}
        aria-label="Reset to north"
        title="Reset to north"
      >
        <div ref={compassRef} className="relative h-9 w-9 desk:h-10 desk:w-10">
          <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-black text-rose-400">N</span>
          <span className="absolute left-1/2 top-3 h-3.5 w-0 -translate-x-1/2 border-x-[5px] border-b-[13px] border-x-transparent border-b-rose-500" />
          <span className="absolute bottom-0.5 left-1/2 h-3.5 w-0 -translate-x-1/2 border-x-[5px] border-t-[13px] border-x-transparent border-t-slate-300" />
        </div>
      </button>

      {/* Map data credit (required by the OpenStreetMap licence) */}
      {data?.context && (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+2.75rem)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-white/70 px-1.5 py-0.5 text-[9px] text-slate-700 desk:bottom-[max(0.25rem,env(safe-area-inset-bottom))] desk:text-[10px]"
        >
          Map data {data.context.attribution}
          {sceneMode !== 'site' && ' · drive times approx. (OSRM)'}
        </a>
      )}

      {/* ───────────── Panels ───────────── */}

      {/* Sold / booked plot: just the status, nothing more */}
      {showSoldCard && selected && selectedStatus && (
        <div data-ui-chrome className={`absolute left-1/2 ${ABOVE_STRIP} z-40 -translate-x-1/2 desk:bottom-auto desk:left-4 desk:top-24 desk:translate-x-0`}>
          <div className={`flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2 ${GLASS}`}>
            <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[selectedStatus] }} />
            <span className="whitespace-nowrap text-base font-extrabold">
              Plot {selected.n} <span style={{ color: STATUS_COLORS[selectedStatus] }}>{selectedStatus === 'sold' ? 'Sold' : 'Booked'}</span>
            </span>
            <button type="button" onClick={() => setSelectedId(null)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Available plot: full details */}
      {showPlotCard && selected && (
        <aside data-ui-chrome className={drawerCls}>
          <PanelHead kicker={ventureName(selected.v)} title={`Plot ${selected.n}`} onClose={() => setSelectedId(null)} />
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Available
          </div>
          <dl className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 text-sm">
            {details && (
              <>
                <Row k="Plot size">{details.sizeSqYds.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq. yds</Row>
                <Row k="Dimensions">{details.dimensions}</Row>
                <Row k="Facing">{details.facing}</Row>
                {details.road && <Row k="Road">{details.road}</Row>}
              </>
            )}
            <Row k="Venture">{ventureName(selected.v)}</Row>
            {project.approvalBadge && <Row k="Approvals">{project.approvalBadge}</Row>}
          </dl>
          <div className="mt-4 grid gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-400"
            >
              <Phone className="h-4 w-4" /> Enquire on WhatsApp
            </a>
            {selectedLatLon && (
              <a
                href={googleMapsLink(selectedLatLon.lat, selectedLatLon.lon)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                <MapPin className="h-4 w-4" /> Open plot location in Google Maps
              </a>
            )}
          </div>
        </aside>
      )}

      {/* Plot details (no plot chosen yet): available plots */}
      {showPlotPanel && (
        <aside data-ui-chrome className={drawerCls}>
          <PanelHead kicker="Plot details" title="Tap any plot" onClose={() => setPanel(null)} />
          <p className="mt-2 text-sm text-slate-300">Tap a plot on the map or search its number. Plots open for booking right now:</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {availablePins.map((p) => (
              <button key={p.id} type="button" onClick={() => selectPlot(p.id)} className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-2 py-2 text-center hover:bg-emerald-500/25">
                <div className="text-sm font-extrabold text-emerald-300">{p.n}</div>
                <div className="text-[10px] text-slate-400">
                  {project.plotDetails?.[p.id] ? `${project.plotDetails[p.id].sizeSqYds} sq. yds · ${project.plotDetails[p.id].facing}` : project.ventures.find((v) => v.key === p.v)?.shortName}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Project details */}
      {panel === 'project' && !selected && (
        <aside data-ui-chrome className={drawerCls}>
          <PanelHead kicker={project.location} title={project.projectName} onClose={() => setPanel(null)} />
          {project.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- remote CMS image inside a client-only overlay
            <img src={`${project.images[0]}?w=640&auto=format`} alt={project.projectName} className="mt-3 aspect-video w-full rounded-2xl object-cover" />
          )}
          {project.approvalBadge && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {project.approvalBadge} approved
            </div>
          )}
          <dl className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 text-sm">
            {project.ventures.map((v) => {
              const n = data?.plots.filter((p) => p.v === v.key).length ?? 0
              return (
                <Row key={v.key} k={v.name}>
                  <button type="button" className="font-bold text-amber-300 hover:underline" onClick={() => goVenture(v.key)}>
                    {n.toLocaleString('en-IN')} plots
                  </button>
                </Row>
              )
            })}
            <Row k="Total plots">{(data?.plots.length ?? 0).toLocaleString('en-IN')}</Row>
            <Row k="Available now">
              <span className="font-bold text-emerald-400">{counts.available}</span>
            </Row>
            <Row k="District">{project.district}</Row>
          </dl>
          <a
            href={project.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300"
          >
            <Navigation className="h-4 w-4" /> Get directions
          </a>
        </aside>
      )}

      {/* Nearby locations: project highlights + connectivity */}
      {panel === 'nearby' && (
        <aside data-ui-chrome className={drawerCls}>
          <PanelHead kicker="Nearby locations" title="Project highlights" onClose={() => setPanel(null)} />
          {project.highlights && project.highlights.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {project.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {h}
                </li>
              ))}
            </ul>
          )}
          {region && (
            <>
              <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Connectivity (by road, approx.)</div>
              <ul className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
                {region.landmarks.map((l) => (
                  <li key={l.n} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LANDMARK_COLORS[l.k] ?? '#fbbf24' }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{l.n}</div>
                      {l.sub && <div className="truncate text-[11px] text-slate-400">{l.sub}</div>}
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold">{l.km} km</div>
                      <div className="text-slate-400">~{l.min} min</div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}

      {/* ORR & RRR */}
      {panel === 'rings' && region && (
        <aside data-ui-chrome className={drawerCls}>
          <PanelHead kicker="Connectivity" title="ORR & RRR" onClose={() => setPanel(null)} />
          <div className="mt-4 grid gap-2">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <span className="h-1.5 w-8 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
              <div className="flex-1">
                <div className="text-sm font-bold">{region.orr.name}</div>
                <div className="text-[11px] text-slate-400">158 km expressway around Hyderabad</div>
              </div>
              <div className="text-right text-sm font-extrabold">{region.orr.aerialKm} km</div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <span className="h-1.5 w-8 shrink-0 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />
              <div className="flex-1">
                <div className="text-sm font-bold">{region.rrr.name}</div>
                <div className="text-[11px] text-slate-400">Proposed outer ring via Chevella &amp; Shadnagar</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            ORR distance is aerial. The RRR northern alignment is as mapped on OpenStreetMap; the dashed southern arc is indicative only, as its alignment is
            not final.
          </p>
        </aside>
      )}

      {/* GPU reset (phones can drop the 3D context when the app is backgrounded) */}
      {contextLost && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/80 p-6 text-center">
          <div>
            <div className="text-base font-bold">The 3D view was paused by your device</div>
            <button type="button" onClick={restart3D} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
              <RotateCcw className="h-4 w-4" /> Reload 3D view
            </button>
          </div>
        </div>
      )}

      {/* Loading / error */}
      {(!ready || error) && !contextLost && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950 p-6">
          <div className="text-center">
            {error ? (
              <>
                <div className="text-lg font-bold">Could not load the 3D layout</div>
                <div className="mt-1 text-sm text-slate-400">{error}</div>
                <a href={project.pdfLayoutUrl} className="mt-4 inline-block rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
                  Open layout PDF instead
                </a>
              </>
            ) : (
              <>
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                <div className="mt-4 text-sm font-semibold tracking-wide text-slate-300">Building {project.projectName} in 3D…</div>
              </>
            )}
          </div>
        </div>
      )}

      {download && (
        <DownloadPopup isOpen onClose={() => setDownload(null)} urls={download.urls} projectName={project.projectName} documentType={download.documentType} />
      )}
    </div>
  )
}

function PanelHead({ kicker, title, onClose }: { kicker: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">{kicker}</div>
        <div className="mt-0.5 text-2xl font-black">{title}</div>
      </div>
      <button type="button" onClick={onClose} className="-m-1 rounded-full p-2 hover:bg-white/10" aria-label="Close">
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-right font-semibold text-slate-100">{children}</dd>
    </div>
  )
}

interface MenuItemProps {
  n?: number
  icon?: React.ReactNode
  label: string
  color: string
  active?: boolean
  onClick?: () => void
  href?: string
}

/** Desktop menu row, styled after the reference: numbered badge + label, active row glows blue. */
function MenuPill({ n, icon, label, color, active, onClick, href }: MenuItemProps) {
  const cls = `flex w-full items-center gap-3 rounded-full border px-2.5 py-2 text-left text-sm font-bold transition ${
    active
      ? 'border-blue-300/60 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-900/40'
      : 'border-white/10 bg-slate-950/75 text-slate-100 backdrop-blur-xl hover:bg-slate-900/90'
  }`
  const inner = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ background: active ? 'rgba(255,255,255,0.25)' : color }}>
        {icon ?? n}
      </span>
      <span className="truncate">{label}</span>
    </>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {inner}
    </button>
  )
}

/** Phone menu chip. */
function MenuChip({ n, icon, label, color, active, onClick, href }: MenuItemProps) {
  const cls = `flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-bold ${
    active ? 'border-blue-300/60 bg-blue-600 text-white' : 'border-white/10 bg-slate-950/85 text-slate-100 backdrop-blur-xl'
  }`
  const inner = (
    <>
      <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: active ? 'rgba(255,255,255,0.25)' : color }}>
        {icon ?? n}
      </span>
      {label}
    </>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {inner}
    </button>
  )
}

function ToolButton({ label, icon, onClick, active }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-xl transition desk:h-9 desk:w-9 ${active ? 'bg-amber-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
    >
      {icon}
    </button>
  )
}
