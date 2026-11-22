#!/usr/bin/env bash
# Regenerate public/data/layouts/vian-valley-shabad.json from the layout PDF.
# Usage: scripts/layout3d/run.sh [pdf] [out.json]
set -euo pipefail
cd "$(dirname "$0")/../.."
PDF="${1:-public/documents/vian_valley_shabad_layout.pdf}"
OUT="${2:-public/data/layouts/vian-valley-shabad.json}"
WORK="$(mktemp -d)"
PY="${PYTHON:-python3}"
"$PY" -c "import pymupdf, cv2, shapely, numpy, skimage" 2>/dev/null || {
  echo "Install deps first: $PY -m pip install -r scripts/layout3d/requirements.txt" >&2; exit 1; }
D=scripts/layout3d
"$PY" -W ignore "$D/replay.py"  "$PDF" "$WORK/clean.png" 6                       # vector redraw without text
"$PY" -W ignore "$D/extract.py" "$WORK/clean.png" 6 "$WORK/plots_raw.json"       # plot regions + numbers
"$PY" -W ignore "$D/fix.py"     "$WORK/plots_raw.json" "$PDF" "$WORK/plots.json" "$WORK/clean.png.paths.pkl"
"$PY" -W ignore "$D/export.py"  "$PDF" "$WORK/clean.png" "$WORK/plots.json" "$WORK/layout_pdf.json"
"$PY" -W ignore "$D/geo.py"     "$WORK/layout_pdf.json" "$OUT"                    # real-world position + OSM context
"$PY" -W ignore "$D/decor.py"   "$OUT"                                            # road graph, trees
"$PY" "$D/region.py" "$D/data/hyderabad_rings_osm.json" "${OUT%.json}-region.json" # ORR / RRR / landmarks
"$PY" "$D/preview.py" "$WORK/layout_pdf.json" "$WORK/preview.png" 0.6 150,330,1400,1850
echo "Preview of the PDF extraction: $WORK/preview.png"
node --test tests/layout3d-data.test.mjs
