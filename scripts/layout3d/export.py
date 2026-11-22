"""Build the 3D layout dataset from the vector PDF + extracted plots."""
import sys, json, pickle, math
import numpy as np, cv2, pymupdf as fitz
from shapely.geometry import Polygon
pdf, clean, Z, plotsf, out = sys.argv[1], sys.argv[2], 6, sys.argv[3], sys.argv[4]
page = fitz.open(pdf)[0]
paths = pickle.load(open(clean + '.paths.pkl', 'rb'))
img = cv2.imread(clean)[:, :, ::-1].astype(np.int16)
H, W, _ = img.shape
def near(rgb, tol=18):
    c = np.array([int(round(v * 255)) for v in rgb], np.int16)
    return (np.abs(img - c).sum(2) < tol)
road = near((0.3, 0.3, 0.31), 24)
water = near((0.0, 0.69, 0.94), 40)
greenv = np.zeros((H, W), bool)
for g in [(0.0, 0.66, 0.35), (0.0, 0.49, 0.28), (0.0, 0.58, 0.35), (0.66, 0.82, 0.27)]:
    greenv |= near(g, 40)
D = json.load(open(plotsf))
plotmask = np.zeros((H, W), np.uint8)
for p in D['plots']:
    cv2.fillPoly(plotmask, [(np.array(p['poly']) * Z).astype(np.int32)], 1)
# park imagery: green pixels of the original render inside large non-tree image placements
orig = page.get_pixmap(matrix=fitz.Matrix(Z, Z), alpha=False)
o = np.frombuffer(orig.samples, np.uint8).reshape(orig.h, orig.w, 3)
hsv = cv2.cvtColor(o, cv2.COLOR_RGB2HSV)
gpix = (hsv[:, :, 0] > 30) & (hsv[:, :, 0] < 95) & (hsv[:, :, 1] > 60) & (hsv[:, :, 2] > 40)
trees = []
parkbox = np.zeros((H, W), bool)
for info in page.get_image_info(xrefs=True):
    x0, y0, x1, y1 = info['bbox']; w, h = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if x0 < 10 and w > 150: continue           # aerial photo / city art
    if y1 < 260: continue                        # header logos / badge
    if 12 <= w <= 22 and 12 <= h <= 22:
        trees.append([round(cx, 1), round(y1 - h * 0.25, 1), 0, round(max(w, h), 1)])
    elif 40 <= w <= 56 and 40 <= h <= 56:
        trees.append([round(cx, 1), round(y1 - h * 0.15, 1), 1, round(max(w, h), 1)])
    elif 700 < cx < 1400 and 500 < cy < 1250 or 150 < cx < 450 and 1500 < cy < 1760 or 520 < cx < 760 and 980 < cy < 1330:
        parkbox[int(y0 * Z):int(y1 * Z), int(x0 * Z):int(x1 * Z)] = True
greens = (greenv | (parkbox & gpix)) & ~road & ~water & (plotmask == 0)
greens = cv2.morphologyEx(greens.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
greens = cv2.morphologyEx(greens, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
def polys(mask, eps=0.25, minarea=4.0):
    cnts, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    res = []
    if hier is None: return res
    hier = hier[0]
    for i, c in enumerate(cnts):
        if hier[i][3] != -1: continue
        if cv2.contourArea(c) / Z / Z < minarea: continue
        def simp(cc): return (cv2.approxPolyDP(cc, eps * Z, True)[:, 0, :] / Z).round(2)
        outer = simp(c); holes = []
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) / Z / Z > 1.0: holes.append(simp(cnts[j]).ravel().tolist())
            j = hier[j][0]
        if len(outer) >= 3: res.append(dict(o=outer.ravel().tolist(), h=holes))
    return res
roads = polys(road & (plotmask == 0) | road, 0.2, 6)
def _c(sh): a = np.array(sh['o']).reshape(-1, 2); return a.mean(0), a.min(0), a.max(0)
def _keep(sh):
    c, lo, hi = _c(sh)
    if 740 < c[0] < 1010 and 1550 < c[1] < 1860: return False   # 'layout map' inset in the legend corner
    if hi[0] < 300 and 1100 < c[1] < 1260: return False          # 'SHABAD MUNICIPALITY' signboard
    return True
roads = [r for r in roads if _keep(r)]
marks_keep = _keep
waters = polys(water, 0.2, 2)
greenp = [g for g in polys(greens, 0.3, 6) if _c(g)[0][1] > 300]   # drop header artwork (developer logo)
# road markings: small white blobs sitting on asphalt
white = near((1.0, 1.0, 1.0), 30) & (plotmask == 0)
n, lb, st, _ = cv2.connectedComponentsWithStats(white.astype(np.uint8), connectivity=8)
roadd = road.astype(np.uint8)
marks = []
for k in range(1, n):
    a = st[k, cv2.CC_STAT_AREA] / Z / Z
    if not (0.15 < a < 14): continue
    x, y, w, h = st[k, :4]
    ring = roadd[max(0, y - 6):y + h + 6, max(0, x - 6):x + w + 6]
    if ring.mean() < 0.55: continue
    ys, xs = np.nonzero(lb[y:y + h, x:x + w] == k)
    (cx, cy), (rw, rh), ang = cv2.minAreaRect(np.stack([xs + x, ys + y], 1).astype(np.float32))
    if max(rw, rh) / Z < 1.2: continue
    box = cv2.boxPoints(((cx, cy), (rw, rh), ang)) / Z
    if marks_keep(dict(o=box.ravel().tolist())): marks.append(box.round(2).ravel().tolist())
# digit outlines: rebuild subpaths of each template glyph from the vector paths
SIG = {'llclccll': '1', 'llcccccccclcccccccccl': '2', 'lccccccclcccccclcccccccccccc': '3', 'l' * 14: '4',
       'lcccccccllllllccccccc': '5', 'l' + 'c' * 23: '6', 'lllccclccl': '7', 'c' * 32: '8', 'c' * 20: '0'}
anchors = {'4': (954.6, 653), '0': (956.8, 653), '5': (959, 659.3), '6': (959, 665.4), '7': (959, 671.6),
           '8': (959, 680.3), '1': (957.4, 710.6), '2': (959.4, 723), '3': (959.5, 729.2)}
def bez(p0, p1, p2, p3, n=6):
    t = np.linspace(0, 1, n + 1)[1:, None]
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3
digits = {}
for x in paths:
    if x['type'] != 'f': continue
    s = ''.join(i[0] for i in x['items'])
    if s not in SIG: continue
    d = SIG[s]
    if d in digits: continue
    P = np.array([(q.x, q.y) for it in x['items'] for q in it[1:]])
    c = P.mean(0)
    ax, ay = anchors[d]
    if abs(c[0] - ax) > 1.6 or abs(c[1] - ay) > 1.8: continue
    subs, cur, last = [], [], None
    for it in x['items']:
        a = np.array([it[1].x, it[1].y])
        if last is None or np.hypot(*(a - last)) > 1e-3:
            if cur: subs.append(cur)
            cur = [a]
        if it[0] == 'l':
            b = np.array([it[2].x, it[2].y]); cur.append(b); last = b
        else:
            pts = [np.array([q.x, q.y]) for q in it[1:5]]
            cur.extend(list(bez(*pts))); last = pts[3]
    if cur: subs.append(cur)
    rings = [Polygon(np.array(r) - c) for r in subs if len(r) >= 3]
    rings.sort(key=lambda r: -r.area)
    shapes = []
    for r in rings:
        host = next((sh for sh in shapes if sh['poly'].contains(r.representative_point())), None)
        if host is not None: host['h'].append(np.array(r.exterior.coords[:-1]).round(3).ravel().tolist())
        else: shapes.append(dict(poly=r, o=np.array(r.exterior.coords[:-1]).round(3).ravel().tolist(), h=[]))
    digits[d] = [dict(o=sh['o'], h=sh['h']) for sh in shapes]
assert len(digits) == 9, digits.keys()
# '9' is the '6' outline turned 180 degrees in this font
digits['9'] = [dict(o=[-v for v in sh['o']], h=[[-v for v in h] for h in sh['h']]) for sh in digits['6']]
# plot colour -> brochure legend category
CAT = {(0.9, 0.75, 0.4): 'eastNorth', (0.61, 0.43, 0.05): 'corner', (0.73, 0.68, 0.84): 'mortgage',
       (0.92, 0.62, 0.11): 'road60', (0.99, 0.84, 0.27): 'road100', (1.0, 1.0, 1.0): 'standard'}
def cat_of(p):
    if p.get('color'): return CAT.get(tuple(p['color']), 'standard')
    cx, cy = p['c']; rgb = img[int(cy * Z), int(cx * Z)] / 255
    best = min(CAT, key=lambda k: np.abs(np.array(k) - rgb).sum()); return CAT[best]
plots = []
for p in D['plots']:
    poly = Polygon(p['poly']).simplify(0.05)
    if not poly.exterior.is_ccw: poly = Polygon(list(poly.exterior.coords)[::-1])
    g = [[q['d'], q['x'], q['y'], q['s'], q['th']] for q in p['glyphs']]
    if p.get('text'):  # numbers set as live text in the PDF ("01".."39")
        t = p['text']; s = t['size'] / 4.6; w = 2.05 * s; txt = page.get_textbox(fitz.Rect(t['x'] - 6, t['y'] - 2, t['x'] + 6, t['y'] + 2)).strip()
        lbl = txt if txt.isdigit() else p['n']
        for i, ch in enumerate(lbl):
            g.append([ch, round(t['x'] + (i - (len(lbl) - 1) / 2) * w, 3), t['y'], round(s, 4), 0.0])
    plots.append(dict(id=f"{p['v']}-{p['n']}", v=p['v'], n=p['n'], cat=cat_of(p), a=round(poly.area, 1),
                      p=np.array(poly.exterior.coords[:-1]).round(2).ravel().tolist(), g=g))
plots.sort(key=lambda q: (q['v'], int(q['n'])))
data = dict(version=1, source='vian_valley_shabad_layout.pdf', units='pdf-points', page=[page.rect.width, page.rect.height],
            digits=digits, plots=plots, roads=roads, water=waters, greens=greenp, marks=marks, trees=trees)
json.dump(data, open(out, 'w'), separators=(',', ':'))
print(len(plots), 'plots', len(roads), 'roads', len(waters), 'water', len(greenp), 'greens', len(marks), 'marks', len(trees), 'trees')
