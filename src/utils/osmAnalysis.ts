import { OSM_PARAMETER_MAP, SCORE_WEIGHTS, FeatureParams } from './climateParameters';

interface LatLon { lat: number; lon: number; }

export interface BBox { south: number; west: number; north: number; east: number; }
export interface PolyArea { points: Array<{ lat: number; lon: number }> }
export type AnalysisArea = BBox | PolyArea;
export function isBBox(a: AnalysisArea): a is BBox { return 'south' in a; }

export interface AnalysisResult {
  uhiScore: number;
  subScores: {
    surfaceHeatLoad: number;
    vegetationCooling: number;
    waterRegulation: number;
    morphologyRisk: number;
    anthropogenicPressure: number;
  };
  categoryBreakdown: Record<string, number>;
  keyBreakdown: Record<string, number>;
  featureCount: number;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

function shoelaceAreaDeg2(coords: LatLon[]): number {
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i].lon * coords[j].lat;
    area -= coords[j].lon * coords[i].lat;
  }
  return Math.abs(area / 2);
}

function lineLength(coords: LatLon[]): number {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dLat = coords[i + 1].lat - coords[i].lat;
    const dLon = coords[i + 1].lon - coords[i].lon;
    len += Math.sqrt(dLat * dLat + dLon * dLon);
  }
  return len;
}

function toValidGeometry(geometry: any[]): LatLon[] {
  return geometry
    .map((g: any) => ({ lat: Number(g?.lat), lon: Number(g?.lon) }))
    .filter((g: LatLon) => Number.isFinite(g.lat) && Number.isFinite(g.lon));
}

const HIGHWAY_WIDTHS_DEG: Record<string, number> = {
  highway_primary:     0.000095,
  highway_secondary:   0.000082,
  highway_tertiary:    0.000068,
  highway_residential: 0.000055,
  highway_service:     0.000041,
  highway_footway:     0.000018,
};

// ── Surface material helpers ──────────────────────────────────────────────────
const ASPHALT_SURFACES   = new Set(['asphalt', 'tar', 'chipseal', 'bituminous']);
const CONCRETE_SURFACES  = new Set(['concrete', 'concrete:lanes', 'concrete:plates']);
const PAVING_SURFACES    = new Set([
  'paving_stones', 'paving:stones', 'cobblestone', 'sett', 'unhewn_cobblestone', 'bricks',
  'granite', 'marble', 'stone', 'limestone', 'basalt', 'slate_stone',
  'tiles', 'ceramic', 'pebblestone', 'compacted', 'flagstone', 'slabs',
]);
const GRAVEL_SURFACES    = new Set(['gravel', 'fine_gravel', 'crushed_limestone', 'laterite']);
const GRASS_SURFACES     = new Set(['grass', 'ground', 'earth', 'mud', 'turf']);
const DIRT_SURFACES      = new Set(['dirt', 'soil', 'clay']);
const SAND_SURFACES      = new Set(['sand']);
const WOOD_SURFACES      = new Set(['wood', 'woodchips', 'boardwalk']);
const UNPAVED_SURFACES   = new Set(['unpaved', 'grass_paver', 'stepping_stones']);

const URBAN_SEMI_PERM_KEYS = new Set([
  'highway_footway',
  'landuse_institutional',
  'surface_paving',
  'surface_wood_deck',
]);

const GREEN_CONTEXT_KEYS = new Set([
  'landuse_forest',
  'landuse_grass',
  'landuse_meadow',
  'natural_wood',
  'natural_scrub',
  'natural_grassland',
  'leisure_park',
  'leisure_garden',
  'leisure_pitch',
]);

const GREEN_GAP_FILL_KEYS = new Set([
  ...Array.from(GREEN_CONTEXT_KEYS),
  'surface_grass',
]);

const CAMPUS_OPEN_CONTEXT_VALUES = new Set([
  'university',
  'college',
  'school',
  'education',
  'institutional',
]);

const WATER_CONTEXT_KEYS = new Set([
  'natural_water',
  'natural_wetland',
  'natural_coastline',
  'waterway_river',
  'waterway_stream',
  'waterway_canal',
]);

function normalizeTagValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function classifySingleSurface(s: string): string | null {
  if (ASPHALT_SURFACES.has(s))  return 'surface_asphalt';
  if (CONCRETE_SURFACES.has(s)) return 'surface_concrete';
  if (PAVING_SURFACES.has(s))   return 'surface_paving';
  if (GRAVEL_SURFACES.has(s))   return 'surface_gravel';
  if (GRASS_SURFACES.has(s))    return 'surface_grass';
  if (DIRT_SURFACES.has(s))     return 'surface_dirt';
  if (SAND_SURFACES.has(s))     return 'surface_sand';
  if (WOOD_SURFACES.has(s))     return 'surface_wood_deck';
  if (UNPAVED_SURFACES.has(s))  return 'surface_unpaved';
  return null;
}

function classifySurface(value: string): string | null {
  const surfaces = value
    .split(';')
    .map(normalizeTagValue)
    .filter(Boolean);

  for (const surface of surfaces) {
    const classified = classifySingleSurface(surface);
    if (classified) return classified;
  }
  return null;
}

function classifyTreeNode(tags: Record<string, string>): string {
  const lt = tags.leaf_type;
  const lc = tags.leaf_cycle;
  if (lc === 'deciduous' || lt === 'broadleaved') return 'tree_deciduous';
  if (lc === 'evergreen' || lt === 'needleleaved') return 'tree_evergreen';
  if (lt === 'mixed' || lc === 'semi_evergreen')  return 'tree_mixed';
  return 'natural_tree';
}

/** Classify a building's roof material using OSM tags.
 *  Priority: roof:material → roof:shape (flat→concrete) → building type heuristic → default (tile). */
function classifyRoofMaterial(tags: Record<string, string>): string {
  const rm = normalizeTagValue(tags['roof:material'] || '');
  const bt = normalizeTagValue(tags.building || '');

  if (bt === 'roof') return 'roof_metal';

  // Explicit roof:material tag
  if (rm) {
    if (['tile', 'tiles', 'roof_tiles', 'terracotta', 'clay', 'ceramic'].includes(rm)) return 'roof_tiles';
    if (['concrete', 'reinforced_concrete', 'cement'].includes(rm))                    return 'roof_concrete';
    if (['metal', 'steel', 'iron', 'zinc', 'copper', 'aluminium', 'aluminum', 'tin'].includes(rm)) return 'roof_metal';
    if (['grass', 'green', 'plants', 'sedum', 'living'].includes(rm))                 return 'roof_green';
    if (['asphalt', 'tar_paper', 'bitumen', 'felt', 'gravel'].includes(rm))           return 'roof_asphalt';
    if (['slate', 'stone', 'rock'].includes(rm))                                       return 'roof_slate';
    if (['glass', 'polycarbonate', 'plastic', 'acrylic'].includes(rm))                return 'roof_glass';
  }

  // roof:shape=flat strongly implies a concrete or asphalt flat roof
  const rs = normalizeTagValue(tags['roof:shape'] || '');
  if (rs === 'flat') return 'roof_concrete';

  // building type heuristics (when no explicit roof:material)
  if (['industrial', 'warehouse', 'shed', 'hangar', 'barn'].includes(bt)) return 'roof_metal';
  if (['commercial', 'office', 'retail', 'supermarket', 'mall', 'hotel'].includes(bt)) return 'roof_concrete';
  if (['greenhouse'].includes(bt))   return 'roof_glass';
  if (['apartments', 'dormitory', 'block of flats'].includes(bt)) {
    // Multi-storey apartments in Turkey often have flat concrete roofs
    const lvl = parseInt(tags['building:levels'] || '0', 10);
    if (lvl >= 5) return 'roof_concrete';
  }
  if (['house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'cabin', 'farm'].includes(bt)) return 'roof_tiles';

  // Default: kiremit (terracotta tile) is the most common roof type in Turkey
  return 'roof_tiles';
}

function classifyElement(tags: Record<string, string>): string {
  // 1. Buildings — classified by their roof material (top-down / 2-D view)
  if (tags.building && tags.building !== 'no') return classifyRoofMaterial(tags);

  // 2. Lightweight transit canopies / platform covers. Do not classify every
  // platform as metal: only covered elements or explicit roof structures.
  const railway = normalizeTagValue(tags.railway || '');
  const publicTransport = normalizeTagValue(tags.public_transport || '');
  const covered = normalizeTagValue(tags.covered || '');
  const shelterType = normalizeTagValue(tags.shelter_type || '');
  if (
    covered === 'yes' &&
    (railway === 'platform' || publicTransport === 'platform' || shelterType === 'public_transport')
  ) {
    return 'roof_metal';
  }

  // 3. Highway — use surface tag for material accuracy when available
  if (tags.highway) {
    const h = normalizeTagValue(tags.highway);
    const surf = tags.surface ? classifySurface(tags.surface) : null;

    // If surface says it's soft/permeable, trust that over road class
    if (surf === 'surface_grass' || surf === 'surface_dirt' || surf === 'surface_unpaved') return surf;
    if (surf === 'surface_gravel' || surf === 'surface_sand') return surf;

    // For hard-surfaced or unknown, classify by road importance (implies asphalt)
    if (['motorway', 'trunk', 'primary'].includes(h)) return 'highway_primary';
    if (h === 'secondary') return 'highway_secondary';
    if (h === 'tertiary') return 'highway_tertiary';
    if (h === 'residential' || h === 'unclassified') return 'highway_residential';
    if (['footway', 'path', 'cycleway', 'pedestrian', 'steps'].includes(h)) return 'highway_footway';
    return 'highway_service';
  }

  // 4. Landuse — expanded to cover many common OSM values that previously fell
  //    through to 'default' and inflated the unknown/Asfalt buckets.
  if (tags.landuse) {
    const lu = normalizeTagValue(tags.landuse);
    // Forest / dense vegetation
    if (lu === 'forest') return 'landuse_forest';
    // Open green
    if (['grass', 'village_green'].includes(lu)) return 'landuse_grass';
    if (['meadow', 'flowerbed'].includes(lu)) return 'landuse_meadow';
    // Agriculture — treat as grass/low vegetation
    if (['farmland', 'farm', 'orchard', 'vineyard', 'allotments', 'plant_nursery'].includes(lu)) return 'landuse_grass';
    // Cemetery / burial grounds — mostly grass + trees + paths
    if (['cemetery', 'grave_yard'].includes(lu)) return 'leisure_park';
    // Parks / recreation inside landuse
    if (['park', 'recreation_ground'].includes(lu)) return 'leisure_park';
    // Built commercial / institutional
    if (lu === 'commercial') return 'landuse_commercial';
    if (lu === 'industrial') return 'landuse_industrial';
    if (lu === 'retail') return 'landuse_retail';
    if (['residential', 'garages'].includes(lu)) return 'landuse_residential';
    if (['education', 'school', 'university', 'college', 'institutional'].includes(lu)) return 'landuse_institutional';
    if (['healthcare', 'hospital', 'religious', 'place_of_worship'].includes(lu)) return 'landuse_institutional';
    // Hard surfaces
    if (lu === 'parking') return 'landuse_parking';
    if (['railway', 'port', 'depot'].includes(lu)) return 'highway_service';
    if (['military', 'aerodrome'].includes(lu)) return 'highway_service';
    // Brownfield / construction — bare unpaved ground
    if (['construction', 'brownfield', 'landfill', 'quarry'].includes(lu)) return 'surface_unpaved';
    // Remaining greenfields / nature reserves
    if (['greenfield', 'nature_reserve', 'conservation'].includes(lu)) return 'natural_grassland';
  }

  // 5. Natural features — tree nodes get leaf-type detail
  if (tags.natural) {
    const n = normalizeTagValue(tags.natural);
    if (n === 'tree') return classifyTreeNode(tags);
    if (n === 'wood' || n === 'scrubland') {
      const lt = tags.leaf_type;
      const lc = tags.leaf_cycle;
      if (lc === 'deciduous' || lt === 'broadleaved') return 'tree_deciduous';
      if (lc === 'evergreen' || lt === 'needleleaved') return 'tree_evergreen';
      return 'natural_wood';
    }
    if (n === 'scrub') return 'natural_scrub';
    if (n === 'grassland' || n === 'heath') return 'natural_grassland';
    if (n === 'water') return 'natural_water';
    if (n === 'coastline') return 'natural_coastline';
    if (n === 'wetland') return 'natural_wetland';
    if (['bare_rock', 'scree', 'cliff'].includes(n)) return 'surface_gravel';
    if (['sand', 'beach', 'dune'].includes(n)) return 'surface_sand';
  }

  // 5. Leisure — expanded
  if (tags.leisure) {
    const l = normalizeTagValue(tags.leisure);
    if (['park', 'nature_reserve', 'cemetery', 'dog_park', 'playground',
         'recreation_ground', 'common', 'forest'].includes(l)) return 'leisure_park';
    if (l === 'garden') return 'leisure_garden';
    if (['pitch', 'sports_centre', 'stadium', 'track'].includes(l)) return 'leisure_pitch';
    if (['golf_course', 'disc_golf_course'].includes(l)) return 'leisure_park';
    if (['swimming_pool', 'marina', 'water_park'].includes(l)) return 'natural_water';
  }

  // 6. Amenity areas — most fall to non-building classifications
  if (tags.amenity) {
    const a = normalizeTagValue(tags.amenity);
    if (['grave_yard', 'cemetery'].includes(a)) return 'leisure_park';
    if (a === 'parking') return 'landuse_parking';
    if (['school', 'university', 'college', 'hospital', 'clinic', 'place_of_worship', 'monastery'].includes(a)) return 'landuse_institutional';
    if (['park', 'community_centre'].includes(a)) return 'leisure_park';
  }

  // 7. Waterway
  if (tags.waterway) {
    const w = normalizeTagValue(tags.waterway);
    if (w === 'river') return 'waterway_river';
    if (['stream', 'canal', 'drain', 'ditch'].includes(w)) return 'waterway_stream';
  }

  // 8. Standalone surface=* areas (no other primary tag matched above)
  if (tags.surface) {
    const surf = classifySurface(tags.surface);
    if (surf) return surf;
  }

  return 'default';
}

function isClosedWay(geometry: LatLon[]): boolean {
  if (geometry.length < 3) return false;
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  return Math.abs(first.lat - last.lat) < 1e-7 && Math.abs(first.lon - last.lon) < 1e-7;
}

/**
 * OSM returns the FULL geometry of a way even when only part of it falls inside
 * the analysis bbox.  A large commercial-district landuse polygon that only clips
 * 5 % of the analysis box would otherwise claim 80 % of the total area (the old
 * hard clamp).  Instead, we scale the computed shoelace area down by the fraction
 * of the polygon's own bounding box that overlaps the analysis bbox — a fast O(n)
 * heuristic that requires no polygon-clipping library.
 */
function clipPolyAreaToBBox(areaDeg2: number, geom: LatLon[], ab: BBox): number {
  let pN = -Infinity, pS = Infinity, pE = -Infinity, pW = Infinity;
  for (const p of geom) {
    if (p.lat > pN) pN = p.lat;
    if (p.lat < pS) pS = p.lat;
    if (p.lon > pE) pE = p.lon;
    if (p.lon < pW) pW = p.lon;
  }
  const polyBoxArea = (pN - pS) * (pE - pW);
  if (polyBoxArea <= 0) return areaDeg2;

  const iN = Math.min(pN, ab.north);
  const iS = Math.max(pS, ab.south);
  const iE = Math.min(pE, ab.east);
  const iW = Math.max(pW, ab.west);
  if (iN <= iS || iE <= iW) return 0;

  const fraction = ((iN - iS) * (iE - iW)) / polyBoxArea;
  return areaDeg2 * fraction;
}

function elementCenter(el: any): LatLon | null {
  const lat = Number(el?.center?.lat);
  const lon = Number(el?.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function isLocalContext(el: any, bbox: BBox): boolean {
  const center = elementCenter(el);
  if (!center) return true;
  const latPad = Math.max((bbox.north - bbox.south) * 8, 0.005);
  const lonPad = Math.max((bbox.east - bbox.west) * 8, 0.005);
  return (
    center.lat >= bbox.south - latPad &&
    center.lat <= bbox.north + latPad &&
    center.lon >= bbox.west - lonPad &&
    center.lon <= bbox.east + lonPad
  );
}

function isCampusOpenContext(tags: Record<string, string>): boolean {
  const amenity = normalizeTagValue(tags.amenity || '');
  const landuse = normalizeTagValue(tags.landuse || '');
  return CAMPUS_OPEN_CONTEXT_VALUES.has(amenity) || CAMPUS_OPEN_CONTEXT_VALUES.has(landuse);
}

interface WeightedFeature {
  key: string;
  params: FeatureParams;
  areaDeg2: number;
  contextOnly?: boolean;
}

function areaCenter(area: AnalysisArea): LatLon {
  if (isBBox(area)) {
    return {
      lat: (area.south + area.north) / 2,
      lon: (area.west + area.east) / 2,
    };
  }
  return {
    lat: area.points.reduce((sum, p) => sum + p.lat, 0) / area.points.length,
    lon: area.points.reduce((sum, p) => sum + p.lon, 0) / area.points.length,
  };
}

function buildOverpassQuery(area: AnalysisArea): string {
  const spatial = isBBox(area)
    ? `(${area.south},${area.west},${area.north},${area.east})`
    : `(poly:"${area.points.map(p => `${p.lat} ${p.lon}`).join(' ')}")`;
  const bbox = isBBox(area) ? area : polyToBBox(area.points);
  const center = areaCenter(area);
  const latPad = (bbox.north - bbox.south) * 2;
  const lonPad = (bbox.east - bbox.west) * 2;
  const greenContextSpatial = `(${bbox.south - latPad},${bbox.west - lonPad},${bbox.north + latPad},${bbox.east + lonPad})`;
  return `[out:json][timeout:25];
is_in(${center.lat},${center.lon})->.containing_areas;
(
  way["building"]${spatial};
  way["building"="roof"]${spatial};
  way["highway"]${spatial};
  way["railway"="platform"]${spatial};
  way["public_transport"="platform"]${spatial};
  way["covered"="yes"]${spatial};
  way["landuse"]${spatial};
  way["natural"]["natural"!="tree"]${spatial};
  way["leisure"]${spatial};
  way["waterway"]${spatial};
  way["surface"]${spatial};
  way["amenity"~"grave_yard|cemetery|parking|school|university|hospital|place_of_worship"]${spatial};
  way["amenity"~"university|college|school"]${greenContextSpatial};
  way["landuse"~"education|university|institutional"]${greenContextSpatial};
  way["natural"="coastline"]${greenContextSpatial};
  way["natural"="water"]${greenContextSpatial};
  way["water"]${greenContextSpatial};
  relation["natural"="water"]${greenContextSpatial};
  relation["water"]${greenContextSpatial};
  way["landuse"~"forest|grass|meadow|flowerbed|orchard|nature_reserve|conservation|park|recreation_ground"]${greenContextSpatial};
  way["natural"~"wood|scrub|grassland|heath|wetland"]${greenContextSpatial};
  way["leisure"~"park|garden|nature_reserve|recreation_ground|common|forest|playground"]${greenContextSpatial};
  area.containing_areas["landuse"~"forest|grass|meadow|flowerbed|orchard|nature_reserve|conservation|park|recreation_ground"];
  area.containing_areas["natural"~"wood|scrub|grassland|heath|wetland"];
  area.containing_areas["leisure"~"park|garden|nature_reserve|recreation_ground|common|forest|playground"];
  area.containing_areas["amenity"~"university|college|school"];
  area.containing_areas["landuse"~"education|university|institutional"];
  relation["landuse"]${greenContextSpatial};
  relation["leisure"]${greenContextSpatial};
  relation["natural"]${greenContextSpatial};
  relation["amenity"~"university|college|school"]${greenContextSpatial};
  node["natural"="tree"]${spatial};
);
out geom;`;
}

function polyToBBox(points: Array<{ lat: number; lon: number }>): BBox {
  return {
    south: Math.min(...points.map(p => p.lat)),
    north: Math.max(...points.map(p => p.lat)),
    west:  Math.min(...points.map(p => p.lon)),
    east:  Math.max(...points.map(p => p.lon)),
  };
}

const TREE_NODE_AREA_DEG2 = 0.000000028; // ~25m² canopy proxy in degrees²
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

function overpassErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('504') || message.includes('timeout')) {
    return 'OpenStreetMap veri servisi zaman aşımına uğradı. Lütfen tekrar deneyin veya biraz daha küçük bir alan seçin.';
  }
  if (message.includes('429')) {
    return 'OpenStreetMap veri servisi şu an çok yoğun. Biraz bekleyip tekrar deneyin.';
  }
  return 'OpenStreetMap verisi alınamadı. İnternet bağlantısını kontrol edip tekrar deneyin.';
}

/** Calls the /api/overpass Vercel proxy (avoids CORS issues in production).
 *  Falls back to a direct Overpass request for local dev where the proxy isn't running. */
async function fetchOSMData(query: string): Promise<any> {
  // In production, always use the server-side proxy
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isLocalDev) {
    // Production: route through Vercel serverless function
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35_000);
    try {
      const res = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Proxy error ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('abort');
      if (isAbort) throw new Error('İstek zaman aşımına uğradı. Tekrar deneyin veya daha küçük bir alan çizin.');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Local dev: call Overpass directly. POST is more reliable than a long
  // querystring URL and lets us fail over cleanly between public mirrors.
  let lastErr: unknown;
  const postBody = `data=${encodeURIComponent(query)}`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 28_000);
    try {
      const res = await Promise.race([
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: postBody,
          signal: ctrl.signal,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 29_000)),
      ]) as Response;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(overpassErrorMessage(lastErr ?? new Error('Tüm Overpass sunucularına bağlanılamadı.')));
}

export async function analyzeArea(area: AnalysisArea): Promise<AnalysisResult> {
  const query = buildOverpassQuery(area);
  // Bounding box for area calculations
  const bbox: BBox = isBBox(area) ? area : polyToBBox(area.points);

  const data = await fetchOSMData(query);
  const elements: any[] = data.elements || [];

  const bboxArea = (bbox.north - bbox.south) * (bbox.east - bbox.west);
  const features: WeightedFeature[] = [];
  const contextOnlyFeatures: WeightedFeature[] = [];
  const waterContextFeatures: WeightedFeature[] = [];
  const campusContextFeatures: WeightedFeature[] = [];

  for (const el of elements) {
    const tags: Record<string, string> = el.tags || {};
    const key = classifyElement(tags);
    const params = OSM_PARAMETER_MAP[key] ?? OSM_PARAMETER_MAP['default'];

    let areaDeg2 = 0;

    const isWaterContext = WATER_CONTEXT_KEYS.has(key);
    const isGeometrylessGreenContext = GREEN_CONTEXT_KEYS.has(key) && (el.type === 'area' || !Array.isArray(el.geometry));
    if (!isLocalContext(el, bbox) && (isGeometrylessGreenContext || isCampusOpenContext(tags))) {
      continue;
    }
    if (isCampusOpenContext(tags) && (el.type === 'area' || !Array.isArray(el.geometry))) {
      campusContextFeatures.push({ key: 'surface_grass', params: OSM_PARAMETER_MAP['surface_grass'], areaDeg2: bboxArea, contextOnly: true });
      continue;
    }
    if (isWaterContext && (el.type === 'area' || key === 'natural_coastline' || !Array.isArray(el.geometry))) {
      waterContextFeatures.push({ key: 'natural_water', params: OSM_PARAMETER_MAP['natural_water'], areaDeg2: bboxArea, contextOnly: true });
      continue;
    }
    if (isGeometrylessGreenContext) {
      contextOnlyFeatures.push({ key, params, areaDeg2: bboxArea, contextOnly: true });
      continue;
    } else if (el.type === 'node') {
      areaDeg2 = TREE_NODE_AREA_DEG2;
    } else if (el.type === 'way' && Array.isArray(el.geometry)) {
      const geom = toValidGeometry(el.geometry);
      if (geom.length < 2) continue;
      if (isClosedWay(geom)) {
        // Scale the polygon area by how much of its bounding box overlaps the
        // analysis bbox — prevents large district-level polygons from dominating.
        areaDeg2 = clipPolyAreaToBBox(shoelaceAreaDeg2(geom), geom, bbox);
      } else {
        const width = HIGHWAY_WIDTHS_DEG[key] ?? 0.000041;
        // For open ways (roads), clip the area similarly
        areaDeg2 = clipPolyAreaToBBox(lineLength(geom) * width, geom, bbox);
      }
    }

    // Hard cap: no single feature exceeds 60% of bbox (guards against degenerate geometries)
    areaDeg2 = Math.min(areaDeg2, bboxArea * 0.60);

    if (areaDeg2 > 0) {
      features.push({ key, params, areaDeg2 });
    }
  }

  // Sum all feature areas (can exceed bbox due to overlaps — normalise by max of sum or bbox)
  const rawMappedArea = features.reduce((s, f) => s + f.areaDeg2, 0);
  if (rawMappedArea < bboxArea * 0.05 && waterContextFeatures.length > 0) {
    features.push(waterContextFeatures[0]);
  } else if (rawMappedArea < bboxArea * 0.05 && campusContextFeatures.length > 0) {
    features.push(campusContextFeatures[0]);
  } else if (rawMappedArea < bboxArea * 0.05 && contextOnlyFeatures.length > 0) {
    features.push(...contextOnlyFeatures);
  }

  const totalArea = Math.max(features.reduce((s, f) => s + f.areaDeg2, 0), bboxArea);

  // Weighted sums for each dimension
  let heatLoadSum = 0;
  let coolingSum = 0;
  let morphSum = 0;

  const categoryAreas: Record<string, number> = {};
  const keyAreas: Record<string, number> = {};

  for (const f of features) {
    const w = f.areaDeg2 / totalArea;
    heatLoadSum += f.params.heatLoad * w;
    coolingSum += f.params.coolingPotential * w;
    morphSum += f.params.morphologyImpact * w;

    const cat = f.params.category;
    categoryAreas[cat] = (categoryAreas[cat] || 0) + f.areaDeg2;
    keyAreas[f.key] = (keyAreas[f.key] || 0) + f.areaDeg2;
  }

  // Uncovered area: OSM doesn't tag every surface. Instead of dumping everything
  // into 'unknown', infer the likely surface type from the detected context.
  const rawFeatureSum = features.reduce((s, f) => s + f.areaDeg2, 0);
  const coveredRatio  = Math.min(rawFeatureSum / bboxArea, 1);
  const uncovered     = 1 - coveredRatio;

  if (uncovered > 0) {
    // Context-aware default: look at what IS identified to guess the gap.
    const identifiedArea = Math.max(rawFeatureSum, Number.EPSILON);
    const identifiedBuilding   = (categoryAreas['building']   || 0) / identifiedArea;
    const identifiedImpervious = (categoryAreas['impervious'] || 0) / identifiedArea;
    const identifiedWater      = (categoryAreas['water']      || 0) / identifiedArea;
    const identifiedUrbanSemiPerm = Array.from(URBAN_SEMI_PERM_KEYS)
      .reduce((sum, key) => sum + (keyAreas[key] || 0), 0) / identifiedArea;
    const identifiedGreenGapContext = Array.from(GREEN_GAP_FILL_KEYS)
      .reduce((sum, key) => sum + (keyAreas[key] || 0), 0) / identifiedArea;

    // In urban areas (>30% built, road, or hard pedestrian context) untagged
    // gaps are mostly paved squares, sidewalks, courtyards, and alleys.
    // In green areas (>30% vegetation) untagged gaps lean toward grass/soil.
    const urbanRatio = identifiedBuilding + identifiedImpervious + identifiedUrbanSemiPerm;
    const greenRatio = identifiedWater + identifiedGreenGapContext;
    const isSparsePedestrianOnly =
      coveredRatio < 0.05 &&
      identifiedUrbanSemiPerm >= 0.60 &&
      identifiedBuilding < 0.10 &&
      identifiedImpervious < 0.10;

    let gapHeatLoad: number, gapCooling: number, gapMorph: number;
    let gapCategory: string;

    let gapKey: string;
    if (rawFeatureSum <= 0) {
      gapHeatLoad = 0.50; gapCooling = 0.20; gapMorph = 0.20;
      gapCategory = 'unknown'; gapKey = 'default';
    } else if (greenRatio >= 0.30 || isSparsePedestrianOnly) {
      // Parks often contain only mapped paths inside a small selection, while
      // the enclosing park polygon sits outside the bbox nodes. Avoid letting a
      // few footways convert the whole green patch into paving.
      gapHeatLoad = 0.18; gapCooling = 0.42; gapMorph = 0.00;
      gapCategory = 'vegetation'; gapKey = 'surface_grass';
    } else if (urbanRatio >= 0.30) {
      // Urban gap → sidewalks, courtyards, small alleys → paving
      gapHeatLoad = 0.68; gapCooling = 0.08; gapMorph = 0.12;
      gapCategory = 'semi_perm'; gapKey = 'surface_paving';
    } else {
      // Mixed/neutral → unpaved
      gapHeatLoad = 0.45; gapCooling = 0.20; gapMorph = 0.08;
      gapCategory = 'semi_perm'; gapKey = 'surface_unpaved';
    }

    heatLoadSum += gapHeatLoad * uncovered;
    coolingSum  += gapCooling  * uncovered;
    morphSum    += gapMorph    * uncovered;
    // Write to BOTH categoryAreas AND keyAreas so keyBreakdown picks it up
    categoryAreas[gapCategory] = (categoryAreas[gapCategory] || 0) + uncovered * bboxArea;
    keyAreas[gapKey]            = (keyAreas[gapKey]            || 0) + uncovered * bboxArea;
  }

  // Normalisation denominator — used for both sub-scores and display breakdown.
  // Sum of raw feature areas can exceed bboxArea due to overlapping OSM polygons.
  const rawIdentifiedSum = Math.max(
    Object.values(categoryAreas).reduce((s, a) => s + a, 0),
    bboxArea * 0.01
  );

  // Sub-scores (0-100)
  const surfaceHeatLoad = Math.round(heatLoadSum * 100);
  const vegetationCooling = Math.round(coolingSum * 100);
  const waterArea = Math.min((categoryAreas['water'] || 0) / rawIdentifiedSum, 1);
  const waterRegulation = Math.round(Math.min(waterArea * 5, 1) * 80 + coolingSum * 20);
  const morphologyRisk = Math.round(morphSum * 100);
  const buildingCoverage = Math.min((categoryAreas['building'] || 0) / rawIdentifiedSum, 1);
  const roadCoverage = Math.min((categoryAreas['impervious'] || 0) / rawIdentifiedSum, 1);
  const anthropogenicPressure = Math.round(Math.min((buildingCoverage + roadCoverage) * 1.2, 1) * 100);

  // UHI composite (high = hot/risky)
  const vegetationDeficit = 100 - vegetationCooling;
  const waterDeficit = 100 - Math.min(waterRegulation, 100);

  const uhiScore = Math.round(
    SCORE_WEIGHTS.surfaceHeatLoad * surfaceHeatLoad +
    SCORE_WEIGHTS.morphologyRisk * morphologyRisk +
    SCORE_WEIGHTS.vegetationDeficit * vegetationDeficit +
    SCORE_WEIGHTS.waterDeficit * waterDeficit +
    SCORE_WEIGHTS.anthropogenicPressure * anthropogenicPressure
  );

  // Category breakdown — normalise by rawIdentifiedSum so values sum to ~100%.
  const categoryBreakdown: Record<string, number> = {};
  for (const [cat, area] of Object.entries(categoryAreas)) {
    const pct = Math.round((area / rawIdentifiedSum) * 100);
    if (pct > 0) categoryBreakdown[cat] = pct;
  }

  // Key breakdown — same normalisation, gives per-OSM-type percentages.
  const keyBreakdown: Record<string, number> = {};
  for (const [key, area] of Object.entries(keyAreas)) {
    const pct = Math.round((area / rawIdentifiedSum) * 100);
    if (pct > 0) keyBreakdown[key] = pct;
  }

  const swot = generateSWOT({
    uhiScore,
    surfaceHeatLoad,
    vegetationCooling,
    waterRegulation,
    morphologyRisk,
    anthropogenicPressure,
    categoryBreakdown,
    keyBreakdown,
  });

  return {
    uhiScore: Math.min(Math.max(uhiScore, 0), 100),
    subScores: { surfaceHeatLoad, vegetationCooling, waterRegulation, morphologyRisk, anthropogenicPressure },
    categoryBreakdown,
    keyBreakdown,
    featureCount: elements.length,
    swot,
  };
}

interface SWOTInput {
  uhiScore: number;
  surfaceHeatLoad: number;
  vegetationCooling: number;
  waterRegulation: number;
  morphologyRisk: number;
  anthropogenicPressure: number;
  categoryBreakdown: Record<string, number>;
  keyBreakdown: Record<string, number>;
}

function generateSWOT(input: SWOTInput) {
  const { surfaceHeatLoad, vegetationCooling, waterRegulation, morphologyRisk, categoryBreakdown, keyBreakdown } = input;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  const sumKeys = (keys: string[]) => keys.reduce((sum, key) => sum + (keyBreakdown[key] || 0), 0);
  const buildingPct = categoryBreakdown['building'] || 0;
  const imperviousPct = categoryBreakdown['impervious'] || 0;
  const vegetationPct = categoryBreakdown['vegetation'] || 0;
  const institutionalPct = keyBreakdown['landuse_institutional'] || 0;
  const asphaltPct = sumKeys([
    'surface_asphalt',
    'landuse_parking',
    'highway_primary',
    'highway_secondary',
    'highway_tertiary',
    'highway_residential',
    'highway_service',
  ]);
  const pavingPct = sumKeys(['surface_paving', 'highway_footway']);
  const loosePct = sumKeys(['surface_gravel', 'surface_unpaved', 'surface_wood_deck', 'surface_dirt', 'surface_sand']);
  const treePct = sumKeys([
    'natural_tree',
    'natural_wood',
    'tree_deciduous',
    'tree_evergreen',
    'tree_mixed',
    'natural_scrub',
    'leisure_park',
    'leisure_garden',
  ]);
  const grassPct = sumKeys(['surface_grass', 'landuse_grass', 'landuse_meadow', 'natural_grassland', 'leisure_pitch']);
  const hasOpenInstitutionalGreen = institutionalPct >= 20 && vegetationPct >= 25;

  // Strengths
  if (hasOpenInstitutionalGreen) strengths.push('Açık kampüs/kurumsal yeşil doku yapı yoğunluğunu düşürerek havalandırmayı destekliyor');
  if (treePct >= 25) strengths.push('Mevcut ağaç dokusu yaya akslarında gölge ve doğal soğutma sağlıyor');
  else if (vegetationCooling >= 50) strengths.push('Yeşil örtü doğal soğutma ve gölge potansiyeli sağlıyor');
  if (grassPct >= 20) strengths.push('Çim/çayırlık yüzeyler sert zeminlere göre ısı emilimini sınırlıyor');
  if (waterRegulation >= 40) strengths.push('Su unsurları yerel buharlaşma yoluyla soğutmaya katkı sağlıyor');
  if (morphologyRisk < 35) strengths.push('Açık kentsel doku doğal havalandırma koridorlarını destekliyor');
  if (imperviousPct < 15 && asphaltPct < 10) strengths.push('Asfalt ve koyu geçirimsiz yüzey oranı düşük olduğu için ısı birikimi sınırlı');

  // Weaknesses
  if (surfaceHeatLoad >= 65) weaknesses.push('Yüksek oranda koyu geçirimsiz yüzeyler ısı birikimine yol açıyor');
  if (treePct < 20 && vegetationCooling < 50) weaknesses.push('Sürekli gölge sağlayacak ağaç örtüsü bazı yaya güzergahlarında zayıf kalıyor');
  else if (vegetationCooling < 30) weaknesses.push('Etkin soğutma için ağaç gölgesi ve yeşil örtü yetersiz kalıyor');
  if (waterRegulation < 25) weaknesses.push('Su unsurlarının yokluğu buharlaşmalı soğutma potansiyelini kısıtlıyor');
  if (morphologyRisk >= 60) weaknesses.push('Yoğun yapı kütlesi hava akışını engelliyor ve ısıyı hapsediyor');
  if (asphaltPct >= 20) weaknesses.push('Asfalt ve servis yolu yüzeyleri yerel ısı yükünü artırıyor');
  if (pavingPct >= 35) weaknesses.push('Sert kaplama yaya yüzeyleri gölgesiz kaldığında öğlen saatlerinde termal konforu düşürebilir');
  if (buildingPct >= 30) weaknesses.push('Yapı/çatı yüzeyi oranı açık alan soğutma etkisini sınırlıyor');

  // Opportunities
  if (hasOpenInstitutionalGreen) opportunities.push('Açık kampüs alanındaki yaya aksları gölgeli, suyu geçiren ve serin oturma/dinlenme noktalarıyla yeniden düzenlenebilir');
  if (pavingPct >= 15) opportunities.push('Sert kaplama yaya yüzeylerinde açık renkli doğal taş, geçirgen derz ve gölgeleme kullanılarak ısı yükü azaltılabilir');
  if (loosePct >= 10) opportunities.push('Gevşek veya belirsiz zeminler sıkıştırılmış geçirgen yüzeylerle erişilebilir ve daha serin hale getirilebilir');
  if (treePct < 35 && vegetationPct >= 20) opportunities.push('Mevcut yeşil doku, yaya yolları boyunca gölge sürekliliği verecek ağaç kümeleriyle tamamlanabilir');
  if (waterRegulation < 30) opportunities.push('Açık alanın düşük kotlu kenarlarında yağmur bahçesi, bitkilendirilmiş yağmur suyu hendeği veya sığ su öğeleri eklenebilir');
  if (buildingPct >= 30) opportunities.push('Mevcut binalarda yeşil çatı ve duvar uygulaması potansiyeli var');
  if (!hasOpenInstitutionalGreen && morphologyRisk < 45) opportunities.push('Düşük yoğunluklu boşluklarda küçük gölgeli yeşil alanlar anlık serinleme odakları oluşturabilir');
  if (morphologyRisk >= 50) opportunities.push('Rüzgar koridoru analizi havalandırma iyileştirme noktalarını belirleyebilir');

  // Threats
  if (surfaceHeatLoad >= 60) threats.push('Yaya bölgelerinde ısı dalgası döneminde termal konfor riski yüksek');
  if (morphologyRisk >= 55) threats.push('Yoğun yapı kütlesi gece ısı tutarak kentsel ısı adasını güçlendiriyor');
  if (imperviousPct >= 35) threats.push('Düşük geçirgenlik yağmur döneminde hem sel hem ısı riskini artırıyor');
  if (hasOpenInstitutionalGreen) threats.push('Açık yeşil kampüs alanının sert kaplama veya yapılaşma baskısıyla azalması soğutma etkisini zayıflatabilir');
  else threats.push('Yapılaşma baskısıyla yeşil örtünün giderek azalması UHI\'yı daha da kötüleştirebilir');
  if (input.uhiScore >= 60) threats.push('Artan kentsel ısı, müdahale olmadan açık alan kullanımını kısıtlayabilir');

  return { strengths, weaknesses, opportunities, threats };
}
