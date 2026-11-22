"""Place the brochure layout at its real location and add real-world context.

Usage: python geo.py <exported.json> <out.json>

* Each venture is moved from brochure PDF points to a north-up world frame using
  the satellite-fitted transforms in georef.json (1 world unit ≈ 1 VV1 brochure
  point ≈ 1.43 m). Plot outlines and number glyphs are transformed exactly.
* Only brochure roads that belong to the ventures are kept; the brochure's
  schematic highways are replaced by the real road network from OpenStreetMap.
* Context from OpenStreetMap (© OpenStreetMap contributors, ODbL): roads with
  realistic widths, centre dashes on main roads, land use, water bodies, place
  names, and procedurally generated village houses inside built-up areas.
"""
import sys, os, json, math
import numpy as np
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union, linemerge
from shapely.affinity import affine_transform
from shapely.strtree import STRtree
import shapely

HERE = os.path.dirname(os.path.abspath(__file__))
inp, out = sys.argv[1], sys.argv[2]
G = json.load(open(os.path.join(HERE, 'georef.json')))
OSM = json.load(open(os.path.join(HERE, G['osm'])))
D = json.load(open(inp))
rng = np.random.default_rng(1722)
Z = G['zoom']
NPX = 256 * 2 ** Z

# ───────────────────────── frames ─────────────────────────
aff = {}
for k, v in G['ventures'].items():
    aff[k] = np.array(G['ventures'][v['sameAs']]['affine'] if 'sameAs' in v else v['affine'], float)
A1 = aff['VV1']
U = float(math.sqrt(abs(np.linalg.det(A1[:, :2]))))          # global px per world unit
O = A1[:, 2].copy()                                           # world origin = VV1 PDF origin


def world_affine(v):
    A = aff[v]
    return A[:, :2] / U, (A[:, 2] - O) / U


def apply(v, pts):
    M, t = world_affine(v)
    return np.asarray(pts, float).reshape(-1, 2) @ M.T + t


def ll2w(lat, lon):
    gx = (lon + 180) / 360 * NPX
    r = math.radians(lat)
    gy = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * NPX
    return (gx - O[0]) / U, (gy - O[1]) / U


def w2ll(x, y):
    gx, gy = x * U + O[0], y * U + O[1]
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * gy / NPX)))), gx / NPX * 360 - 180


lat_c, _ = w2ll(*apply('VV1', [[1000, 900]])[0])
MPU = U * 156543.03392 * math.cos(math.radians(lat_c)) / 2 ** Z   # metres per world unit
print(f'world unit = {MPU:.3f} m')


def ring(poly):
    return np.array(poly.exterior.coords[:-1]).round(2).ravel().tolist()


def polys_out(geom, min_area=4.0, simplify=0.15):
    res = []
    if geom.is_empty:
        return res
    for g in (geom.geoms if hasattr(geom, 'geoms') else [geom]):
        if not isinstance(g, Polygon) or g.area < min_area:
            continue
        g = g.simplify(simplify)
        if g.is_empty or not isinstance(g, Polygon):
            continue
        res.append(dict(o=ring(g), h=[np.array(h.coords[:-1]).round(2).ravel().tolist()
                                      for h in g.interiors if Polygon(h).area > 1.0]))
    return res


def shp(sh):
    return Polygon(np.array(sh['o']).reshape(-1, 2), [np.array(h).reshape(-1, 2) for h in sh['h']]).buffer(0)


# ───────────────────────── ventures ─────────────────────────
group_of = {'VV1': 'VV1', 'VV2': 'VV1', 'JC': 'JC'}   # drawing frames
plots_pdf = {g: unary_union([Polygon(np.array(p['p']).reshape(-1, 2)).buffer(0)
                             for p in D['plots'] if group_of[p['v']] == g]) for g in ('VV1', 'JC')}
keep_extra = unary_union([box(*r) for r in G.get('keepRoads', [])]) if G.get('keepRoads') else Polygon()
road_region = {g: plots_pdf[g].buffer(12, join_style=2) for g in plots_pdf}
road_region['VV1'] = road_region['VV1'].union(keep_extra)
near_region = {g: plots_pdf[g].buffer(60) for g in plots_pdf}

new_plots = []
for p in D['plots']:
    g = group_of[p['v']]
    M, t = world_affine(g)
    rot = math.atan2(M[1, 0], M[0, 0])
    sc = math.sqrt(abs(np.linalg.det(M)))
    q = dict(p)
    q['p'] = apply(g, p['p']).round(2).ravel().tolist()
    q['a'] = round(Polygon(np.array(q['p']).reshape(-1, 2)).area, 1)
    q['g'] = [[d, *[round(float(c), 3) for c in apply(g, [[x, y]])[0]], round(s * sc, 4), round(th + rot, 4)]
              for d, x, y, s, th in p['g']]
    new_plots.append(q)

roads, greens, water, marks, trees = [], [], [], [], []
exits_src = []   # (kept venture roads, clip region) in world coords, for access connectors
for g in ('VV1', 'JC'):
    M, t = world_affine(g)
    kept = unary_union([shp(sh) for sh in D['roads']]).intersection(road_region[g])
    for sh in polys_out(kept, 3.0, 0.05):
        roads.append(dict(o=apply(g, sh['o']).round(2).ravel().tolist(), h=[apply(g, h).round(2).ravel().tolist() for h in sh['h']]))
    aff6 = [M[0, 0], M[0, 1], M[1, 0], M[1, 1], t[0], t[1]]
    exits_src.append((affine_transform(kept, aff6), affine_transform(road_region[g], aff6)))
    for src, dst, reg in ((D['greens'], greens, near_region[g]), (D['water'], water, near_region[g].buffer(40))):
        part = unary_union([shp(sh) for sh in src]).intersection(reg)
        for sh in polys_out(part, 2.0, 0.1):
            dst.append(dict(o=apply(g, sh['o']).round(2).ravel().tolist(), h=[apply(g, h).round(2).ravel().tolist() for h in sh['h']]))
    road_union = kept.buffer(0.5)
    for m in D['marks']:
        c = np.array(m).reshape(-1, 2).mean(0)
        if road_union.contains(Point(c)):
            marks.append(apply(g, m).round(2).ravel().tolist())
    sc = math.sqrt(abs(np.linalg.det(M)))
    tree_zone = plots_pdf[g].buffer(30)
    shapely.prepare(tree_zone)
    for tr in D['trees']:
        if tree_zone.contains(Point(tr[0], tr[1])):
            x, y = apply(g, [[tr[0], tr[1]]])[0]
            trees.append([round(float(x), 1), round(float(y), 1), tr[2], round(tr[3] * sc, 1)])

club = None
if G.get('clubhouse'):
    x0, y0, x1, y1 = G['clubhouse']
    club = apply('VV1', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]).round(2).ravel().tolist()

# ───────────────────────── context window ─────────────────────────
allp = np.concatenate([np.array(p['p']).reshape(-1, 2) for p in new_plots])
MARGIN = G.get('contextMarginUnits', 950)
bx0, by0 = allp.min(0) - MARGIN
bx1, by1 = allp.max(0) + MARGIN
window = box(bx0, by0, bx1, by1)
ventures_world = unary_union([Polygon(np.array(p['p']).reshape(-1, 2)).buffer(0) for p in new_plots])
venture_zone = ventures_world.buffer(14)

# Carriageway widths (m), on the same scale as the brochure roads (30/40/60/100 ft = 9/12/18/30 m) so
# the real network and the venture roads read consistently: highway > main road > street > lane.
# Farm tracks are left out (they are dirt paths, not roads).
WIDTH_M = {'motorway': 30, 'trunk': 28, 'primary': 26, 'secondary': 24, 'tertiary': 14, 'unclassified': 10,
           'residential': 8, 'living_street': 7, 'service': 6}


def way_line(e):
    return LineString([ll2w(q['lat'], q['lon']) for q in e['geometry']])


road_geoms, main_lines, seg_lines = [], [], []
water_geoms, landuse = [], []
places, amenities = [], []
for e in OSM['elements']:
    t = e.get('tags', {})
    geom = e.get('geometry')
    if e['type'] == 'way' and geom and len(geom) >= 2:
        hw = t.get('highway', '').replace('_link', '')
        if hw in WIDTH_M:
            ln = way_line(e)
            if not ln.intersects(window):
                continue
            road_geoms.append(ln.buffer(WIDTH_M[hw] / MPU / 2, quad_segs=4, join_style=1))
            seg_lines.append(ln)
            if hw in ('motorway', 'trunk', 'primary', 'secondary'):
                main_lines.append(ln)
        elif t.get('natural') == 'water' and len(geom) >= 4:
            water_geoms.append(Polygon([ll2w(q['lat'], q['lon']) for q in geom]).buffer(0))
        elif 'waterway' in t:
            water_geoms.append(way_line(e).buffer((6 if t['waterway'] in ('river', 'canal') else 2.5) / MPU))
        elif (t.get('landuse') or t.get('leisure')) and len(geom) >= 4:
            kind = t.get('landuse') or t.get('leisure')
            kind = {'farmland': 'farm', 'meadow': 'grass', 'grass': 'grass', 'park': 'park', 'orchard': 'orchard',
                    'forest': 'forest', 'residential': 'residential', 'industrial': 'industrial',
                    'commercial': 'industrial', 'retail': 'industrial'}.get(kind)
            if kind:
                landuse.append((kind, Polygon([ll2w(q['lat'], q['lon']) for q in geom]).buffer(0)))
    if e['type'] == 'node' and t.get('place') in ('town', 'village', 'hamlet', 'suburb') and t.get('name'):
        x, y = ll2w(e['lat'], e['lon'])
        if window.contains(Point(x, y)):
            places.append(dict(n=t['name'], k=t['place'], x=round(x, 1), y=round(y, 1)))
    if t.get('amenity') in ('college', 'university', 'hospital', 'townhall') and t.get('name'):
        g = e.get('geometry') or [e]
        x, y = ll2w(np.mean([q['lat'] for q in g]), np.mean([q['lon'] for q in g]))
        if window.contains(Point(x, y)):
            amenities.append(dict(n=t['name'].title(), k=t['amenity'], x=round(x, 1), y=round(y, 1)))

osm_roads = unary_union(road_geoms).intersection(window)

# Access roads: wherever a venture road is cut at the venture edge and a real road
# lies straight ahead (within ~210 m), join them so every venture connects to the network.
connectors = []
road_tree = STRtree(seg_lines)
for kept_w, region_w in exits_src:
    cuts = kept_w.boundary.intersection(region_w.boundary.buffer(0.25))
    if cuts.is_empty:
        continue
    if cuts.geom_type == 'MultiLineString':
        cuts = linemerge(cuts)
    for seg in (cuts.geoms if hasattr(cuts, 'geoms') else [cuts]):
        if seg.geom_type != 'LineString' or not (2.5 <= seg.length <= 26):
            continue
        m = np.array(seg.interpolate(0.5, normalized=True).coords[0])
        a, b = np.array(seg.coords[0]), np.array(seg.coords[-1])
        tv = (b - a) / max(float(np.hypot(*(b - a))), 1e-6)
        n = np.array([-tv[1], tv[0]])
        if region_w.contains(Point(*(m + n * 2))):
            n = -n
        near = seg_lines[road_tree.nearest(Point(*m))]
        p = np.array(near.interpolate(near.project(Point(*m))).coords[0])
        dv = p - m
        dist = float(np.hypot(*dv))
        if not (2 < dist < 150) or float(np.dot(dv / dist, n)) < 0.6:
            continue
        strip = LineString([m - n * 1.0, p + dv / dist * 2.0]).buffer(seg.length / 2, cap_style=2)
        if strip.intersection(ventures_world).area > 2:
            continue
        connectors.append(strip)
if connectors:
    osm_roads = unary_union([osm_roads] + connectors).intersection(window)
print(f'access connectors: {len(connectors)}')
ctx_roads = polys_out(osm_roads, 4.0, 0.25)
ctx_water = polys_out(unary_union(water_geoms).intersection(window).difference(ventures_world), 6.0, 0.3) if water_geoms else []
ctx_land = []
for kind, poly in landuse:
    for sh in polys_out(poly.intersection(window).difference(venture_zone), 20.0, 0.5):
        ctx_land.append(dict(k=kind, **sh))

# centre dashes on the main roads
ctx_marks = []
for ln in main_lines:
    ln = ln.intersection(window)
    for part in (ln.geoms if hasattr(ln, 'geoms') else [ln]):
        if part.length < 10:
            continue
        for s in np.arange(4, part.length - 4, 11.0):
            a, b = np.array(part.interpolate(s).coords[0]), np.array(part.interpolate(min(s + 4.0, part.length)).coords[0])
            d = b - a
            L = np.hypot(*d)
            if L < 1e-3:
                continue
            n = np.array([-d[1], d[0]]) / L * 0.22
            ctx_marks.append(np.array([a + n, b + n, b - n, a - n]).round(2).ravel().tolist())

# ───────────────────────── village houses ─────────────────────────
# Houses only where people actually live: along mapped streets inside each
# settlement (street frontage), plus a small core around every village centre.
RADIUS = {'town': 420, 'suburb': 220, 'village': 140, 'hamlet': 80}
centres = [(p['x'], p['y'], 400 if p['n'].lower() == 'shabad' else RADIUS[p['k']]) for p in places]
settle = unary_union([Point(cx, cy).buffer(r, quad_segs=8) for cx, cy, r in centres]) if centres else Polygon()
frontage = unary_union([ln.buffer(20, quad_segs=2) for ln in seg_lines]).intersection(settle) if seg_lines else Polygon()
cores = unary_union([Point(cx, cy).buffer(min(r, 55), quad_segs=8) for cx, cy, r in centres]) if centres else Polygon()
built_area = unary_union([frontage, cores] + [poly for kind, poly in landuse if kind == 'residential']).intersection(window)
no_build = unary_union([osm_roads.buffer(1.5), ventures_world.buffer(25),
                        unary_union(water_geoms).buffer(3) if water_geoms else Polygon()])
tree_idx = STRtree(seg_lines)
occ = set()
houses = []
minx, miny, maxx, maxy = built_area.bounds if not built_area.is_empty else (0, 0, 0, 0)
STEP = 6.0
gx, gy = np.meshgrid(np.arange(minx, maxx, STEP), np.arange(miny, maxy, STEP))
cx_ = (gx + rng.random(gx.shape) * STEP).ravel()
cy_ = (gy + rng.random(gy.shape) * STEP).ravel()
shapely.prepare(built_area); shapely.prepare(no_build)
ok = shapely.contains_xy(built_area, cx_, cy_) & ~shapely.contains_xy(no_build, cx_, cy_)
for px_, py_ in zip(cx_[ok], cy_[ok]):
    if True:
        pt = Point(px_, py_)
        # density falls off away from each settlement centre
        dens = 0.3
        for cx, cy, r in centres:
            d = math.hypot(px_ - cx, py_ - cy)
            if d < r:
                dens = max(dens, 0.62 * (1 - (d / r) ** 2) + 0.25)
        if rng.random() > dens:
            continue
        cell = (int(px_ // 4), int(py_ // 4))
        if any((cell[0] + i, cell[1] + j) in occ for i in (-1, 0, 1) for j in (-1, 0, 1)):
            continue
        near = seg_lines[tree_idx.nearest(pt)]
        s = near.project(pt)
        a, b = np.array(near.interpolate(max(0, s - 1)).coords[0]), np.array(near.interpolate(min(near.length, s + 1)).coords[0])
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        w, dpt = 3.5 + rng.random() * 3.5, 4 + rng.random() * 4
        h = 2.2 + rng.random() * 2.2 + (2.2 if rng.random() < 0.28 else 0)
        houses.append([round(px_, 1), round(py_, 1), round(w, 1), round(dpt, 1), round(h, 1), round(ang, 3), int(rng.integers(0, 7))])
        occ.add(cell)

print(f'context: {len(ctx_roads)} road polys, {len(ctx_marks)} dashes, {len(ctx_land)} land-use, {len(ctx_water)} water, '
      f'{len(places)} places, {len(amenities)} amenities, {len(houses)} houses')

# ───────────────────────── output ─────────────────────────
D2 = dict(D)
D2.update(units='world', plots=new_plots, roads=roads, greens=greens, water=water, marks=marks + ctx_marks, trees=trees,
          bounds=[round(bx0, 1), round(by0, 1), round(bx1, 1), round(by1, 1)],
          geo=dict(zoom=Z, origin=[round(float(O[0]), 3), round(float(O[1]), 3)], pxPerUnit=round(U, 6), metersPerUnit=round(MPU, 4)),
          context=dict(roads=ctx_roads, water=ctx_water, landuse=ctx_land, houses=houses, places=places, amenities=amenities,
                       attribution='© OpenStreetMap contributors'))
if club:
    D2['clubhouse'] = club
D2.pop('traffic', None)
json.dump(D2, open(out, 'w'), separators=(',', ':'))
for v in ('VV1', 'VV2', 'JC'):
    pts = np.concatenate([np.array(p['p']).reshape(-1, 2) for p in new_plots if p['v'] == v])
    print(v, 'centre lat/lon', [round(c, 6) for c in w2ll(*pts.mean(0))])
