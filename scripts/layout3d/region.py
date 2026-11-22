"""Regional context for the 'Nearby locations' and 'ORR & RRR' views.

Usage: python region.py <rings_osm.json> <out.json>

* ORR: every Outer Ring Road motorway way from OpenStreetMap (© OpenStreetMap
  contributors, ODbL), merged and simplified to ~40 m.
* RRR north: the proposed alignment mapped in OpenStreetMap (Sangareddy → Choutuppal).
* RRR south: NOT final; drawn through the towns named in public reports
  (Sangareddy – Shankarpally – Chevella – Shadnagar – Amangal – Yacharam – Choutuppal)
  and always labelled as indicative in the viewer.
* Landmarks with road distance / free-flow drive time measured once with the
  public OSRM router (Nov 2026); shown as approximate.

Coordinates are [lat, lon]. Fetch the ORR/RRR extract with fetch_osm.sh --rings.
"""
import sys, json
from shapely.geometry import LineString
from shapely.ops import linemerge, unary_union

src, out = sys.argv[1], sys.argv[2]
O = json.load(open(src))


def lines(pred, tol):
    ls = [LineString([(q['lon'], q['lat']) for q in e['geometry']]) for e in O['elements']
          if e['type'] == 'way' and len(e.get('geometry', [])) >= 2 and pred(e.get('tags', {}))]
    u = unary_union(ls)
    merged = linemerge(u) if u.geom_type == 'MultiLineString' else u
    parts = merged.geoms if hasattr(merged, 'geoms') else [merged]
    res = []
    for p in parts:
        p = p.simplify(tol)
        if p.length < 0.004:          # drop slivers shorter than ~400 m
            continue
        res.append([[round(y, 5), round(x, 5)] for x, y in p.coords])
    return res


orr = lines(lambda t: t.get('ref') == 'ORR' and t.get('highway') == 'motorway', 0.0004)
rrr_north = lines(lambda t: 'Regional Ring Road' in t.get('name', ''), 0.0004)
rrr_south = [[17.6044, 78.0360], [17.4553, 78.1316], [17.3062, 78.1370], [17.1780, 78.1520], [17.0672, 78.2046],
             [16.9300, 78.3800], [16.8481, 78.5326], [16.9500, 78.6400], [17.0466, 78.6700], [17.1700, 78.8100],
             [17.2467, 78.9134]]   # ends meet the mapped northern alignment

region = dict(
    attribution='© OpenStreetMap contributors · drive times: OSRM (approx.)',
    project=dict(name='Vian Valley', lat=17.1665, lon=78.1430),
    orr=dict(name='Outer Ring Road (ORR)', lines=orr, aerialKm=26),
    rrr=dict(name='Regional Ring Road (RRR)', north=rrr_north, southIndicative=rrr_south),
    cities=[
        dict(n='Hyderabad', lat=17.3616, lon=78.4747, k='city'),
        dict(n='Financial District', lat=17.4130, lon=78.3386, k='hub'),
        dict(n='Gachibowli', lat=17.4436, lon=78.3520, k='hub'),
        dict(n='Shamshabad', lat=17.2611, lon=78.3932, k='town'),
        dict(n='Chevella', lat=17.3062, lon=78.1370, k='town'),
        dict(n='Shadnagar', lat=17.0672, lon=78.2046, k='town'),
        dict(n='Sangareddy', lat=17.6248, lon=78.0866, k='town'),
        dict(n='Choutuppal', lat=17.2512, lon=78.8986, k='town'),
        dict(n='Shankarpally', lat=17.4553, lon=78.1316, k='town'),
    ],
    landmarks=[
        dict(n='Chandanvelly Industrial Park', sub='Data-centre & industrial hub', lat=17.2332, lon=78.1718, km=13.5, min=17, k='industry'),
        dict(n='Kanha Shanti Vanam', sub='Heartfulness meditation centre', lat=17.1751, lon=78.2190, km=16.2, min=24, k='culture'),
        dict(n='Shadnagar Railway Station', sub='Rail connectivity', lat=17.0656, lon=78.2135, km=17.3, min=20, k='transport'),
        dict(n='Chevella', sub='Town & bus depot', lat=17.3062, lon=78.1370, km=19.6, min=22, k='town'),
        dict(n='Statue of Equality', sub='Muchintal', lat=17.1858, lon=78.3332, km=40.1, min=39, k='culture'),
        dict(n='Rajiv Gandhi Int. Airport', sub='Shamshabad', lat=17.2403, lon=78.4294, km=53.6, min=48, k='airport'),
        dict(n='Financial District', sub='IT corridor, Gachibowli', lat=17.4130, lon=78.3386, km=54.0, min=48, k='it'),
    ],
)
json.dump(region, open(out, 'w'), separators=(',', ':'))
print('orr parts', len(orr), 'points', sum(len(l) for l in orr), '| rrr north parts', len(rrr_north), 'points', sum(len(l) for l in rrr_north))
