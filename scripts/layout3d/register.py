"""Register a venture's brochure roads against satellite imagery (verification / one-off fitting).

Usage: python register.py <mosaic.png> <tile_x0> <tile_y0> <zoom> <layout.json> <x0,y0,x1,y1> <smin> <smax> [crop x0,y0,x1,y1]

Matches the rasterised brochure road network (PDF points inside the box) to the
bright road lines of a satellite mosaic (white top-hat) over scale/rotation/
translation, then refines. Prints the affine PDF-point → global tile-pixel
transform for scripts/layout3d/georef.json. Imagery is only used to measure the
transform; it is not shipped with the site.
"""
import json, sys
import numpy as np, cv2

sat = cv2.imread(sys.argv[1]); tx0, ty0, z = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
D = json.load(open(sys.argv[5])); x0, y0, x1, y1 = [float(v) for v in sys.argv[6].split(',')]
smin, smax = float(sys.argv[7]), float(sys.argv[8])
cx0 = cy0 = 0
if len(sys.argv) > 9:
    cx0, cy0, cx1, cy1 = [int(v) for v in sys.argv[9].split(',')]
    sat = sat[cy0:cy1, cx0:cx1]
g = cv2.cvtColor(sat, cv2.COLOR_BGR2GRAY).astype(np.float32)
road_like = cv2.GaussianBlur(cv2.morphologyEx(g, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))), (5, 5), 0)
K = 4.0
Wt, Ht = int((x1 - x0) * K), int((y1 - y0) * K)
m = np.zeros((Ht, Wt), np.uint8)


def P(r):
    a = np.array(r, float).reshape(-1, 2)
    return ((a - [x0, y0]) * K * 8).astype(np.int32)


for sh in D['roads']:
    cv2.fillPoly(m, [P(sh['o'])], 1, cv2.LINE_8, 3)
for sh in D['roads']:
    for h in sh['h']:
        a = np.array(h).reshape(-1, 2)
        if 0.5 * abs(np.dot(a[:, 0], np.roll(a[:, 1], 1)) - np.dot(a[:, 1], np.roll(a[:, 0], 1))) > 80:
            cv2.fillPoly(m, [P(h)], 0, cv2.LINE_8, 3)


def score(s, deg):
    M = cv2.getRotationMatrix2D((Wt / 2, Ht / 2), deg, s / K)
    c, sn = abs(M[0, 0]), abs(M[0, 1])
    nw, nh = int(Wt * c + Ht * sn), int(Wt * sn + Ht * c)
    M[0, 2] += nw / 2 - Wt / 2; M[1, 2] += nh / 2 - Ht / 2
    if nw >= road_like.shape[1] or nh >= road_like.shape[0]:
        return -1, None, None
    r = cv2.matchTemplate(road_like, cv2.warpAffine(m.astype(np.float32), M, (nw, nh)), cv2.TM_CCOEFF_NORMED)
    _, v, _, loc = cv2.minMaxLoc(r)
    return v, M, loc


best = max(((score(s, d)[0], s, d) for s in np.arange(smin, smax, 0.02) for d in np.arange(-8, 8.1, 1.0)))
_, s0, d0 = best
best = max(((score(s, d)[0], s, d) for s in np.arange(s0 - 0.03, s0 + 0.031, 0.005) for d in np.arange(d0 - 1, d0 + 1.01, 0.1)))
v, s, d = best
_, M, loc = score(s, d)
A = np.vstack([M, [0, 0, 1]]) @ np.array([[K, 0, -x0 * K], [0, K, -y0 * K], [0, 0, 1]])
A[0, 2] += loc[0] + cx0 + tx0 * 256
A[1, 2] += loc[1] + cy0 + ty0 * 256
print(json.dumps(dict(zoom=z, score=round(float(v), 3), scale=round(float(s), 4), rotationDeg=round(float(d), 2),
                      affine=[[round(float(q), 6) for q in row] for row in A[:2]])))
