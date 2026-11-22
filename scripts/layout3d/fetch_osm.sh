#!/usr/bin/env bash
# Refresh the OpenStreetMap extract used for the 3D context (© OpenStreetMap contributors, ODbL).
set -euo pipefail
cd "$(dirname "$0")"
BBOX="17.105,78.075,17.215,78.215"
Q="[out:json][timeout:120];(way[\"highway\"]($BBOX);way[\"waterway\"]($BBOX);way[\"natural\"=\"water\"]($BBOX);relation[\"natural\"=\"water\"]($BBOX);way[\"landuse\"]($BBOX);way[\"leisure\"]($BBOX);way[\"railway\"]($BBOX);node[\"place\"](17.05,78.0,17.27,78.3);nwr[\"amenity\"~\"college|university|school|hospital|townhall\"]($BBOX);way[\"building\"]($BBOX););out geom tags;"
curl -sf --max-time 180 -A "layout-3d-context/1.0" --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter -o data/shabad_osm.json
echo "saved data/shabad_osm.json"
