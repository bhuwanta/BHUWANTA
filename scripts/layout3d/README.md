# Layout PDF → 3D dataset

Builds `public/data/layouts/vian-valley-shabad.json` (consumed by
`src/components/3d/layout`) straight from the developer's **vector** layout PDF,
so the 3D twin is an exact copy of the brochure: no tracing, no texture blur.

```bash
python3 -m pip install -r scripts/layout3d/requirements.txt
scripts/layout3d/run.sh            # regenerates the JSON and runs the data test
```

| Step | What it does |
| --- | --- |
| `replay.py` | Re-draws every vector path except text glyphs and renders at 6×, giving clean plot regions separated by the black divider lines. |
| `extract.py` | Labels each plot region, reads plot numbers from the vector digit outlines (each digit has a unique path signature; 6/9 resolved by Procrustes rotation), traces exact polygons. |
| `fix.py` | Splits regions where a divider stops short of the block edge (cut along the real divider), adds plots whose numbers are live text (01–39), assigns ventures (VV1 / VV2 / JC). |
| `export.py` | Exports roads (with holes), stream, greens, lane markings, tree positions, digit outlines and plots with legend category. |
| `geo.py` | Places each venture at its real position (transforms in `georef.json`, fitted against satellite imagery with `register.py`) and adds real surroundings from OpenStreetMap: roads with consistent widths, villages, place names, access roads joining venture roads to the network. |
| `decor.py` | Builds the drivable road graph for the ambient traffic and plants avenue / park / countryside trees (never on plots, water or driving lanes). |
| `region.py` | `vian-valley-region.json`: ORR, RRR (mapped north + indicative south) and nearby landmarks with approx. drive times, for the "Nearby" and "ORR & RRR" views. |
| `preview.py` | 2D render of the JSON for a visual diff against the PDF. |

Venture boundaries and the PDF anchors for digit templates are specific to this
brochure. For a different project's PDF, adjust `venture()` in `fix.py`/`audit`
and the `anchors` in `extract.py`/`export.py`.

`tests/layout3d-data.test.mjs` asserts complete numbering per venture
(Vian Valley-1 1–1342 except 639, which the brochure skips; Vian Valley-2 1–240;
Jubilee Central 1–107), that glyphs spell each number, and that polygons are valid.

OpenStreetMap extracts live in `data/` (refresh with `fetch_osm.sh`). Map data © OpenStreetMap
contributors (ODbL) — the viewer shows this credit. Drive times were measured once with the public
OSRM router and are labelled approximate.
