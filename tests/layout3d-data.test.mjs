import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Regression guard for the 3D layout dataset generated from the brochure PDF
// (scripts/layout3d). If the PDF is re-exported, these checks catch misread or
// missing plot numbers before they reach the live 3D viewer.

const data = JSON.parse(readFileSync(new URL('../public/data/layouts/vian-valley-shabad.json', import.meta.url), 'utf8'))
const config = readFileSync(new URL('../src/data/projects3d/vianValley.ts', import.meta.url), 'utf8')

// Numbers the brochure itself skips (the strip runs 638 → 640)
const KNOWN_GAPS = { VV1: [639] }
const EXPECTED = { VV1: { max: 1342, count: 1341 }, VV2: { max: 240, count: 240 }, JC: { max: 107, count: 107 } }

test('every venture has a complete, unique plot sequence', () => {
  for (const [venture, exp] of Object.entries(EXPECTED)) {
    const nums = data.plots.filter((p) => p.v === venture).map((p) => Number(p.n))
    assert.equal(nums.length, exp.count, `${venture} plot count`)
    assert.equal(new Set(nums).size, nums.length, `${venture} has duplicate plot numbers`)
    const have = new Set(nums)
    const missing = []
    for (let i = 1; i <= exp.max; i++) if (!have.has(i)) missing.push(i)
    assert.deepEqual(missing, KNOWN_GAPS[venture] ?? [], `${venture} missing plots`)
  }
  assert.equal(new Set(data.plots.map((p) => p.id)).size, data.plots.length, 'plot ids are unique')
})

test('plot number glyphs spell the plot number', () => {
  for (const p of data.plots) {
    const spelled = p.g.map((g) => g[0]).join('')
    assert.equal(Number(spelled), Number(p.n), `glyphs of ${p.id} read "${spelled}"`)
    for (const [d, x, y, s] of p.g) {
      assert.ok(data.digits[d], `digit template "${d}" exists`)
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && s > 0.3 && s < 3, `glyph transform of ${p.id}`)
    }
  }
})

test('plot polygons are valid and contain their numbers', () => {
  const inside = (ring, x, y) => {
    let hit = false
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const [xi, yi, xj, yj] = [ring[i], ring[i + 1], ring[j], ring[j + 1]]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  for (const p of data.plots) {
    assert.ok(p.p.length >= 6 && p.p.length % 2 === 0, `${p.id} ring`)
    assert.ok(p.a > 10 && p.a < 2000, `${p.id} area ${p.a}`)
    const [, x, y] = p.g[Math.floor(p.g.length / 2)]
    assert.ok(inside(p.p, x, y), `${p.id} number sits inside its plot`)
  }
})

test('inventory in the project config refers to real plots', () => {
  const ids = new Set(data.plots.map((p) => p.id))
  const block = config.slice(config.indexOf('inventory:'), config.indexOf('defaultStatus'))
  const listed = [...block.matchAll(/'((?:VV1|VV2|JC)-\d+)'/g)].map((m) => m[1])
  assert.ok(listed.length > 0, 'inventory lists plots')
  for (const id of listed) assert.ok(ids.has(id), `inventory plot ${id} exists in the layout`)
})

test('every available plot has sales details, and details only describe real plots', () => {
  const ids = new Set(data.plots.map((p) => p.id))
  const inv = config.slice(config.indexOf('available:'), config.indexOf('booked:'))
  const available = [...inv.matchAll(/'((?:VV1|VV2|JC)-\d+)'/g)].map((m) => m[1])
  const detailsBlock = config.slice(config.indexOf('plotDetails:'), config.indexOf('annotations:'))
  const detailed = [...detailsBlock.matchAll(/'((?:VV1|VV2|JC)-\d+)':\s*\{([^}]*)\}/g)]
  const detailIds = detailed.map((m) => m[1])
  for (const id of available) assert.ok(detailIds.includes(id), `available plot ${id} has details`)
  for (const [, id, body] of detailed) {
    assert.ok(ids.has(id), `details for ${id} refer to a real plot`)
    assert.match(body, /facing: '(East|West|North|South)'/, `${id} facing`)
    assert.match(body, /sizeSqYds: \d+(\.\d+)?/, `${id} size`)
  }
})

test('regional dataset has the ORR ring and landmarks with drive data', () => {
  const region = JSON.parse(readFileSync(new URL('../public/data/layouts/vian-valley-region.json', import.meta.url), 'utf8'))
  const orrPoints = region.orr.lines.reduce((n, l) => n + l.length, 0)
  assert.ok(orrPoints > 100, 'ORR geometry present')
  assert.ok(region.rrr.north.length > 0 && region.rrr.southIndicative.length > 3, 'RRR geometry present')
  for (const l of region.landmarks) assert.ok(l.km > 0 && l.min > 0, `${l.n} has distance and time`)
})
