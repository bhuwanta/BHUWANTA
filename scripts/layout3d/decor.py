"""Add a drivable road graph and generated trees to an exported layout dataset.

Usage: python decor.py <layout.json> [debug.png]

* traffic: road centre-lines (skeleton of the exported road polygons) as a
  junction graph {nodes, edges[a, b, half-width w, polyline p]} for vehicles.
* trees:   appends avenue trees along the wide roads, groves inside parks and
  clustered countryside trees around the township. Generated trees carry a
  5th element `flags` (bit 0 = generated, bit 1 = stands on the road edge in a
  tree guard). Trees never sit on plots, water or driving lanes.

Deterministic (fixed seed): re-running gives identical output and replaces the
previously generated trees instead of adding more.
"""
import sys, json
from collections import defaultdict
import numpy as np, cv2
from skimage.morphology import skeletonize
from shapely.geometry import LineString

K = 1.6        # raster resolution, px per world unit
rng = np.random.default_rng(20261122)

path = sys.argv[1]
D = json.load(open(path))
BX0, BY0, BX1, BY1 = D['bounds']           # world window (see geo.py)
W, H = int((BX1 - BX0) * K), int((BY1 - BY0) * K)
CTX = D.get('context', {})


def px(ring):
    a = np.array(ring, float).reshape(-1, 2)
    return ((a - [BX0, BY0]) * K * 8).astype(np.int32)  # fixed-point (shift=3)


def ring_area(r):
    a = np.array(r, float).reshape(-1, 2)
    return 0.5 * abs(np.dot(a[:, 0], np.roll(a[:, 1], 1)) - np.dot(a[:, 1], np.roll(a[:, 0], 1)))


def raster(polys):
    m = np.zeros((H, W), np.uint8)
    for sh in polys:
        cv2.fillPoly(m, [px(sh['o'])], 1, cv2.LINE_8, 3)
    for sh in polys:
        for h in sh['h']:
            cv2.fillPoly(m, [px(h)], 0, cv2.LINE_8, 3)
    return m


def to_pt(x, y):
    return x / K + BX0, y / K + BY0


def to_px(x, y):
    return int((x - BX0) * K), int((y - BY0) * K)


water = raster(D['water'] + CTX.get('water', []))
greens = raster(D['greens'])
plots = np.zeros((H, W), np.uint8)
for p in D['plots']:
    cv2.fillPoly(plots, [px(p['p'])], 1, cv2.LINE_8, 3)
occupied = (plots | greens | water).astype(bool)


def road_raster():
    """Road surface. Brochure roads: holes that contain nothing (lane dashes, lettering,
    arrows) count as road and hairline strokes are dropped. Real (OSM) roads are used as-is."""
    m = np.zeros((H, W), np.uint8)
    all_roads = D['roads']
    for sh in all_roads:
        cv2.fillPoly(m, [px(sh['o'])], 1, cv2.LINE_8, 3)
    for sh in all_roads:
        for h in sh['h']:
            P = px(h)
            if ring_area(h) < 3000:
                x0, y0 = (P.min(0) >> 3) - 1
                x1, y1 = (P.max(0) >> 3) + 2
                tmp = np.zeros((y1 - y0, x1 - x0), np.uint8)
                cv2.fillPoly(tmp, [P - np.array([x0 << 3, y0 << 3])], 1, cv2.LINE_8, 3)
                occ = occupied[y0:y1, x0:x1][tmp.astype(bool)]
                if occ.size == 0 or occ.mean() < 0.02:
                    continue
            cv2.fillPoly(m, [P], 0, cv2.LINE_8, 3)
    # drop hairline strokes drawn in road grey (outlines) – real roads are ≥ 5 pt wide
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    m |= raster(CTX.get('roads', []))
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


road = road_raster()

# ───────────────────────── road graph ─────────────────────────
dist = cv2.distanceTransform(road, cv2.DIST_L2, 5) / K          # distance to road edge, pt
sk = skeletonize(road > 0)
kern = np.ones((3, 3), np.float32); kern[1, 1] = 0
deg = cv2.filter2D(sk.astype(np.float32), -1, kern, borderType=cv2.BORDER_CONSTANT).astype(np.int32) * sk
nlab, lab = cv2.connectedComponents((sk & (deg != 2)).astype(np.uint8), connectivity=8)
lab = lab.astype(np.int32)
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def nbrs(y, x):
    for dy, dx in NB:
        yy, xx = y + dy, x + dx
        if 0 <= yy < H and 0 <= xx < W and sk[yy, xx]:
            yield yy, xx


cluster_px = defaultdict(list)
for y, x in zip(*np.nonzero(lab)):
    cluster_px[lab[y, x]].append((y, x))
visited = np.zeros((H, W), bool)
raw_edges, seen_direct = [], set()


def trace(p, q):
    pathp = [p, q]
    visited[q] = True
    prev, cur = p, q
    while True:
        nxt = [r for r in nbrs(*cur) if r != prev and r not in pathp[-3:]]
        hit = [r for r in nxt if lab[r] > 0]
        if hit:
            pathp.append(hit[0])
            return lab[hit[0]], pathp
        nxt = [r for r in nxt if not visited[r]]
        if not nxt:
            return None, pathp
        prev, cur = cur, nxt[0]
        visited[cur] = True
        pathp.append(cur)


def run_from(c):
    for p in cluster_px[c]:
        for q in nbrs(*p):
            lq = lab[q]
            if lq == c:
                continue
            if lq > 0:
                key = (min(p, q), max(p, q))
                if key not in seen_direct:
                    seen_direct.add(key)
                    raw_edges.append((c, lq, [p, q]))
                continue
            if visited[q]:
                continue
            end, pp = trace(p, q)
            if end is not None:
                raw_edges.append((c, end, pp))


for c in list(cluster_px):
    run_from(c)
for y, x in np.argwhere(sk & ~visited & (lab == 0)):   # closed loops without junctions
    if visited[y, x] or lab[y, x]:
        continue
    nlab += 1
    lab[y, x] = nlab
    cluster_px[nlab] = [(y, x)]
    visited[y, x] = True
    run_from(nlab)

node_xy = {c: np.mean([to_pt(x + 0.5, y + 0.5) for y, x in pts], 0) for c, pts in cluster_px.items()}
edges = [dict(a=int(a), b=int(b), pts=np.array([to_pt(x + 0.5, y + 0.5) for y, x in pp]),
              hw=np.array([dist[y, x] for y, x in pp])) for a, b, pp in raw_edges]


def length(pts):
    return float(np.sum(np.hypot(*np.diff(pts, axis=0).T))) if len(pts) > 1 else 0.0


def degree():
    d = defaultdict(int)
    for e in edges:
        d[e['a']] += 1; d[e['b']] += 1
    return d


def merge_short(th=1.6):
    """Collapse tiny edges between junction clusters (skeleton staircase artefacts)."""
    global edges
    parent = {}

    def f(x):
        while parent.get(x, x) != x:
            x = parent[x]
        return x
    for e in edges:
        if e['a'] != e['b'] and length(e['pts']) < th:
            ra, rb = f(e['a']), f(e['b'])
            if ra != rb:
                parent[rb] = ra
    groups = defaultdict(list)
    for n in node_xy:
        groups[f(n)].append(n)
    for r, members in groups.items():
        if len(members) > 1:
            node_xy[r] = np.mean([node_xy[m] for m in members], 0)
    edges = [dict(e, a=f(e['a']), b=f(e['b'])) for e in edges
             if not (f(e['a']) == f(e['b']) and length(e['pts']) < 3 * th)]


def join_degree2():
    """Concatenate edges through nodes that only connect two edges."""
    global edges
    changed = True
    while changed:
        changed = False
        inc = defaultdict(list)
        for i, e in enumerate(edges):
            inc[e['a']].append(i); inc[e['b']].append(i)
        for n, ids in inc.items():
            if len(ids) != 2 or ids[0] == ids[1]:
                continue
            e1, e2 = edges[ids[0]], edges[ids[1]]
            f1 = e1['b'] == n
            p1, h1, s1 = (e1['pts'], e1['hw'], e1['a']) if f1 else (e1['pts'][::-1], e1['hw'][::-1], e1['b'])
            f2 = e2['a'] == n
            p2, h2, s2 = (e2['pts'], e2['hw'], e2['b']) if f2 else (e2['pts'][::-1], e2['hw'][::-1], e2['a'])
            new = dict(a=s1, b=s2, pts=np.vstack([p1, p2[1:]]), hw=np.concatenate([h1, h2[1:]]))
            edges = [e for k, e in enumerate(edges) if k not in ids] + [new]
            changed = True
            break


def prune_spurs():
    global edges
    for _ in range(6):
        d = degree()
        keep, removed = [], False
        for e in edges:
            spur = (d[e['a']] == 1) != (d[e['b']] == 1)
            if spur and length(e['pts']) < max(7.0, 1.7 * float(np.max(e['hw']))):
                removed = True
                continue
            keep.append(e)
        edges = keep
        join_degree2()
        if not removed:
            break


def drop_lenses():
    """Remove small loops around road lettering: parallel edges joining the same two nodes, and tiny self-loops."""
    global edges
    best = {}
    out = []
    for e in edges:
        L = length(e['pts'])
        if e['a'] == e['b']:
            if L >= 80:
                out.append(e)
            continue
        key = (min(e['a'], e['b']), max(e['a'], e['b']))
        if key in best:
            other = best[key]
            if L < 80 and length(other['pts']) < 80:
                if L < length(other['pts']):
                    best[key] = e
                continue
            out.append(e)
            continue
        best[key] = e
    edges = out + list(best.values())


merge_short()
join_degree2()
for _ in range(3):
    drop_lenses()
    join_degree2()
    prune_spurs()

# drop tiny disconnected fragments
adj = defaultdict(set)
for i, e in enumerate(edges):
    adj[e['a']].add(i); adj[e['b']].add(i)
comp, cid = {}, 0
for i in range(len(edges)):
    if i in comp:
        continue
    stack = [i]; comp[i] = cid
    while stack:
        k = stack.pop()
        for n in (edges[k]['a'], edges[k]['b']):
            for j in adj[n]:
                if j not in comp:
                    comp[j] = cid; stack.append(j)
    cid += 1
clen = defaultdict(float)
for i, e in enumerate(edges):
    clen[comp[i]] += length(e['pts'])
edges = [e for i, e in enumerate(edges) if clen[comp[i]] >= 60]


def smooth(pts, w):
    p = np.array(LineString(pts).simplify(max(0.45, 0.3 * w)).coords)
    for _ in range(2):                       # Chaikin corner cutting, endpoints fixed
        if len(p) < 3:
            break
        q = [p[0]]
        for i in range(len(p) - 1):
            q += [0.75 * p[i] + 0.25 * p[i + 1], 0.25 * p[i] + 0.75 * p[i + 1]]
        q.append(p[-1])
        p = np.array(q)
    return p


used = sorted({e['a'] for e in edges} | {e['b'] for e in edges})
idx = {n: i for i, n in enumerate(used)}
out_edges = []
for e in edges:
    hw = e['hw']
    core = hw[len(hw) // 5: max(len(hw) // 5 + 1, len(hw) - len(hw) // 5)]
    w = float(np.median(core))
    pts = smooth(e['pts'], w)
    pts[0], pts[-1] = node_xy[e['a']], node_xy[e['b']]
    out_edges.append(dict(a=idx[e['a']], b=idx[e['b']], w=round(w, 2), p=pts.round(2).ravel().tolist()))
nodes = np.array([node_xy[n] for n in used]).round(2)
node_deg = defaultdict(int)
for e in out_edges:
    node_deg[e['a']] += 1; node_deg[e['b']] += 1
D['traffic'] = dict(nodes=nodes.ravel().tolist(), edges=out_edges)
lens = np.array([length(np.array(e['p']).reshape(-1, 2)) for e in out_edges])
print(f"traffic: {len(nodes)} nodes, {len(out_edges)} edges, {lens.sum():.0f} pt of road")

# ───────────────────────── trees ─────────────────────────
pdf_trees = [t[:4] for t in D['trees'] if len(t) < 5 or not (int(t[4]) & 1)]
houses = np.zeros((H, W), np.uint8)
for x, y, w, d, hgt, ang, _ in CTX.get('houses', []):
    R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
    corners = (np.array([[-w, -d], [w, -d], [w, d], [-w, d]]) / 2) @ R.T + [x, y]
    cv2.fillPoly(houses, [px(corners.ravel())], 1, cv2.LINE_8, 3)
if D.get('clubhouse'):
    cv2.fillPoly(houses, [px(D['clubhouse'])], 1, cv2.LINE_8, 3)
hard = (plots | water | houses).astype(bool)        # never place a trunk here
blocked = cv2.dilate(hard.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))).astype(bool)
lane_free = dist <= 1.5            # inside the road only within 1.5 pt of its edge (verge / footpath)
taken = np.zeros((H, W), np.uint8)


def stamp(x, y, r):
    cv2.circle(taken, to_px(x, y), max(1, int(r * K)), 1, -1)


def free(x, y, on_road=False):
    X, Y = to_px(x, y)
    if not (0 <= X < W and 0 <= Y < H) or taken[Y, X] or hard[Y, X]:
        return False
    if road[Y, X]:
        # verge trees: only along the road edge, never in a driving lane
        return on_road and bool(lane_free[Y, X])
    return not blocked[Y, X]


for t in pdf_trees:
    stamp(t[0], t[1], t[3] * (0.17 if t[2] == 0 else 0.12))
gen = []


def add(x, y, kind, size, guard=False, spacing=3.0):
    gen.append([round(float(x), 1), round(float(y), 1), kind, round(float(size), 1), 1 | (2 if guard else 0)])
    stamp(x, y, spacing)


# 1) avenues along wide roads: outside the carriageway when there is open land, else in a tree guard on the verge
avenue = 0
for e in out_edges:
    w = e['w']
    if w < 3.6:
        continue
    P = np.array(e['p']).reshape(-1, 2)
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1]
    clear_a = w + 3.5 if node_deg[e['a']] >= 3 else 3
    clear_b = w + 3.5 if node_deg[e['b']] >= 3 else 3
    spacing = 9.0 if w < 8 else 11.0
    kind = 3 if w < 8 else 2                     # ashoka avenues inside the layout, shade trees on highways
    for s in np.arange(clear_a, L - clear_b, spacing):
        i = min(np.searchsorted(cum, s, side='right') - 1, len(seg) - 1)
        t = (s - cum[i]) / max(seg[i], 1e-6)
        pos = P[i] + (P[i + 1] - P[i]) * t
        d = (P[i + 1] - P[i]) / max(seg[i], 1e-6)
        n = np.array([d[1], -d[0]])
        for side in (1, -1):
            out = pos + side * n * (w + 2.0)
            if free(out[0], out[1]):
                k = kind if rng.random() < 0.8 else 5 - kind
                add(out[0], out[1], k, (7 + rng.random() * 2) if k == 3 else (6 + rng.random() * 2.5), spacing=4)
                avenue += 1
                continue
            edge = pos + side * n * max(w - 1.0, 0.8)
            if free(edge[0], edge[1], on_road=True):
                add(edge[0], edge[1], 3, 6.5 + rng.random() * 1.5, guard=True, spacing=4)
                avenue += 1

# 2) groves inside parks / open spaces
park_mask = cv2.erode(greens, np.ones((3, 3), np.uint8)).astype(bool)
parks = 0
for y in np.arange(0, H, 5 * K):
    for x in np.arange(0, W, 5 * K):
        X = int(x + rng.random() * 5 * K); Y = int(y + rng.random() * 5 * K)
        if X >= W or Y >= H or not park_mask[Y, X] or rng.random() > 0.6:
            continue
        px_, py_ = to_pt(X, Y)
        if not free(px_, py_):
            continue
        r = rng.random()
        if r < 0.68:
            add(px_, py_, 2, 5 + rng.random() * 2.5, spacing=3.2)
        elif r < 0.85:
            add(px_, py_, 1, 34 + rng.random() * 12, spacing=3.2)
        else:
            add(px_, py_, 3, 6 + rng.random() * 2, spacing=2.6)
        parks += 1

# 3) countryside: clustered groves + scattered trees, denser near the township
site = (plots | road | greens | water | houses).astype(np.uint8)
dsite = cv2.distanceTransform(1 - site, cv2.DIST_L2, 5) / K
noise = cv2.resize(rng.random((int(H / (60 * K)) + 2, int(W / (60 * K)) + 2)).astype(np.float32), (W, H),
                   interpolation=cv2.INTER_CUBIC)
noise = (noise - noise.min()) / (noise.max() - noise.min())
country = 0
step = 10 * K
for y in np.arange(0, H, step):
    for x in np.arange(0, W, step):
        X = int(x + rng.random() * step); Y = int(y + rng.random() * step)
        if X >= W or Y >= H:
            continue
        ds = dsite[Y, X]
        if ds < 6:
            continue
        nv = noise[Y, X]
        p = 0.3 if nv > 0.72 else 0.025 if nv > 0.54 else 0.004
        p *= max(0.35, 1 - ds / 600)
        if rng.random() > p:
            continue
        px_, py_ = to_pt(X, Y)
        if not free(px_, py_):
            continue
        r = rng.random()
        if r < 0.72:
            add(px_, py_, 2, 5.5 + rng.random() * 3.5, spacing=4.5)
        elif r < 0.86:
            add(px_, py_, 1, 36 + rng.random() * 14, spacing=4.5)   # toddy palms
        else:
            add(px_, py_, 0, 12 + rng.random() * 6, spacing=4)
        country += 1

D['trees'] = pdf_trees + gen
print(f"trees: {len(pdf_trees)} from PDF + {avenue} avenue + {parks} park + {country} countryside = {len(D['trees'])}")

if len(sys.argv) > 2:
    dbg = np.dstack([road * 90 + plots * 160, road * 90 + greens * 120, road * 90 + water * 200]).astype(np.uint8)
    for e in out_edges:
        pp = ((np.array(e['p']).reshape(-1, 2) - [BX0, BY0]) * K).astype(np.int32)
        cv2.polylines(dbg, [pp], False, (0, 255, 255) if e['w'] >= 4.2 else (255, 0, 255), 2, cv2.LINE_AA)
    for x, y in nodes:
        cv2.circle(dbg, to_px(x, y), 3, (0, 255, 0), -1)
    for t in D['trees']:
        col = (255, 255, 255) if len(t) > 4 and int(t[4]) & 2 else (60, 200, 60) if len(t) > 4 else (0, 120, 255)
        cv2.circle(dbg, to_px(t[0], t[1]), 2, col, -1)
    cv2.imwrite(sys.argv[2], dbg)
json.dump(D, open(path, 'w'), separators=(',', ':'))
