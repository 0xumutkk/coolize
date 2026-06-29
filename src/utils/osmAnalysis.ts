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
const PAVING_SURFACES    = new Set(['paving_stones', 'cobblestone', 'sett', 'unhewn_cobblestone', 'bricks']);
const GRAVEL_SURFACES    = new Set(['gravel', 'fine_gravel', 'compacted', 'pebblestone', 'crushed_limestone']);
const GRASS_SURFACES     = new Set(['grass', 'ground', 'earth', 'mud', 'turf']);
const DIRT_SURFACES      = new Set(['dirt', 'soil', 'clay']);
const SAND_SURFACES      = new Set(['sand']);
const WOOD_SURFACES      = new Set(['wood', 'woodchips', 'boardwalk']);
const UNPAVED_SURFACES   = new Set(['unpaved', 'grass_paver', 'stepping_stones']);

function classifySurface(s: string): string | null {
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
  const rm = (tags['roof:material'] || '').toLowerCase();

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
  const rs = (tags['roof:shape'] || '').toLowerCase();
  if (rs === 'flat') return 'roof_concrete';

  // building type heuristics (when no explicit roof:material)
  const bt = (tags.building || '').toLowerCase();
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

  // 2. Highway — use surface tag for material accuracy when available
  if (tags.highway) {
    const h = tags.highway;
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

  // 3. Landuse
  if (tags.landuse) {
    const lu = tags.landuse;
    if (lu === 'forest') return 'landuse_forest';
    if (lu === 'grass') return 'landuse_grass';
    if (lu === 'meadow') return 'landuse_meadow';
    if (lu === 'commercial') return 'landuse_commercial';
    if (lu === 'industrial') return 'landuse_industrial';
    if (lu === 'retail') return 'landuse_retail';
    if (lu === 'residential') return 'landuse_residential';
    if (lu === 'parking') return 'landuse_parking';
    if (['park', 'recreation_ground', 'greenfield'].includes(lu)) return 'leisure_park';
  }

  // 4. Natural features — tree nodes get leaf-type detail
  if (tags.natural) {
    const n = tags.natural;
    if (n === 'tree') return classifyTreeNode(tags);
    if (n === 'wood' || n === 'scrubland') {
      // Forest polygons: use leaf type if available
      const lt = tags.leaf_type;
      const lc = tags.leaf_cycle;
      if (lc === 'deciduous' || lt === 'broadleaved') return 'tree_deciduous';
      if (lc === 'evergreen' || lt === 'needleleaved') return 'tree_evergreen';
      return 'natural_wood';
    }
    if (n === 'scrub') return 'natural_scrub';
    if (n === 'grassland' || n === 'heath') return 'natural_grassland';
    if (n === 'water') return 'natural_water';
    if (n === 'wetland') return 'natural_wetland';
  }

  // 5. Leisure
  if (tags.leisure) {
    const l = tags.leisure;
    if (l === 'park' || l === 'nature_reserve') return 'leisure_park';
    if (l === 'garden') return 'leisure_garden';
    if (l === 'pitch' || l === 'sports_centre') return 'leisure_pitch';
  }

  // 6. Waterway
  if (tags.waterway) {
    const w = tags.waterway;
    if (w === 'river') return 'waterway_river';
    if (['stream', 'canal', 'drain', 'ditch'].includes(w)) return 'waterway_stream';
  }

  // 7. Standalone surface=* areas (no other primary tag matched above)
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

interface WeightedFeature {
  key: string;
  params: FeatureParams;
  areaDeg2: number;
}

function buildOverpassQuery(area: AnalysisArea): string {
  const spatial = isBBox(area)
    ? `(${area.south},${area.west},${area.north},${area.east})`
    : `(poly:"${area.points.map(p => `${p.lat} ${p.lon}`).join(' ')}")`;
  return `[out:json][timeout:30];
(
  way["building"]${spatial};
  way["highway"]${spatial};
  way["landuse"]${spatial};
  way["natural"]["natural"!="tree"]${spatial};
  way["leisure"]${spatial};
  way["waterway"]${spatial};
  way["surface"]${spatial};
  node["natural"="tree"]${spatial};
  node["amenity"="parking"]${spatial};
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

  // Local dev: call Overpass directly (no CORS issue on localhost)
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let lastErr: unknown;
  for (const base of ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await Promise.race([
        fetch(`${base}?data=${encodeURIComponent(query)}`, { signal: ctrl.signal }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 31_000)),
      ]) as Response;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('Tüm Overpass sunucularına bağlanılamadı.');
}

export async function analyzeArea(area: AnalysisArea): Promise<AnalysisResult> {
  const query = buildOverpassQuery(area);
  // Bounding box for area calculations
  const bbox: BBox = isBBox(area) ? area : polyToBBox(area.points);

  const data = await fetchOSMData(query);
  const elements: any[] = data.elements || [];

  const bboxArea = (bbox.north - bbox.south) * (bbox.east - bbox.west);
  const features: WeightedFeature[] = [];

  for (const el of elements) {
    const tags: Record<string, string> = el.tags || {};
    const key = classifyElement(tags);
    const params = OSM_PARAMETER_MAP[key] ?? OSM_PARAMETER_MAP['default'];

    let areaDeg2 = 0;

    if (el.type === 'node') {
      areaDeg2 = TREE_NODE_AREA_DEG2;
    } else if (el.type === 'way' && Array.isArray(el.geometry)) {
      const geom: LatLon[] = el.geometry.map((g: any) => ({ lat: g.lat, lon: g.lon }));
      if (isClosedWay(geom)) {
        areaDeg2 = shoelaceAreaDeg2(geom);
      } else {
        const width = HIGHWAY_WIDTHS_DEG[key] ?? 0.000041;
        areaDeg2 = lineLength(geom) * width;
      }
    }

    // Clamp: single feature should not exceed 80% of the bbox
    areaDeg2 = Math.min(areaDeg2, bboxArea * 0.80);

    if (areaDeg2 > 0) {
      features.push({ key, params, areaDeg2 });
    }
  }

  // Sum all feature areas (can exceed bbox due to overlaps — normalise by max of sum or bbox)
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
    const identifiedBuilding   = (categoryAreas['building']   || 0) / Math.max(rawFeatureSum, 1);
    const identifiedImpervious = (categoryAreas['impervious'] || 0) / Math.max(rawFeatureSum, 1);
    const identifiedVegetation = (categoryAreas['vegetation'] || 0) / Math.max(rawFeatureSum, 1);
    const identifiedWater      = (categoryAreas['water']      || 0) / Math.max(rawFeatureSum, 1);

    // In urban areas (>30% built environment) untagged gaps are mostly hard
    // surfaces (sidewalks, courtyards, small alleys) — treat as semi-impervious.
    // In green areas (>30% vegetation) untagged gaps lean toward grass/soil.
    const urbanRatio = identifiedBuilding + identifiedImpervious;
    const greenRatio = identifiedVegetation + identifiedWater;

    let gapHeatLoad: number, gapCooling: number, gapMorph: number;
    let gapCategory: string;

    let gapKey: string;
    if (urbanRatio >= 0.30) {
      // Urban gap → sidewalks, courtyards, small alleys → paving
      gapHeatLoad = 0.68; gapCooling = 0.08; gapMorph = 0.12;
      gapCategory = 'semi_perm'; gapKey = 'surface_paving';
    } else if (greenRatio >= 0.30) {
      // Green-dominant gap → grass / soil
      gapHeatLoad = 0.18; gapCooling = 0.42; gapMorph = 0.00;
      gapCategory = 'semi_perm'; gapKey = 'surface_grass';
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
}

function generateSWOT(input: SWOTInput) {
  const { surfaceHeatLoad, vegetationCooling, waterRegulation, morphologyRisk, categoryBreakdown } = input;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Strengths
  if (vegetationCooling >= 50) strengths.push('Geniş bitki örtüsü doğal soğutma ve gölge sağlıyor');
  if (waterRegulation >= 40) strengths.push('Su unsurları yerel buharlaşma yoluyla soğutmaya katkı sağlıyor');
  if (morphologyRisk < 35) strengths.push('Açık kentsel doku doğal havalandırma koridorlarını destekliyor');
  if ((categoryBreakdown['vegetation'] || 0) >= 25) strengths.push('Ortalamanın üzerinde yeşil örtü ısı yükünü azaltıyor');
  if (surfaceHeatLoad < 40) strengths.push('Düşük geçirimsiz yüzey oranı ısı emilimini sınırlıyor');

  // Weaknesses
  if (surfaceHeatLoad >= 65) weaknesses.push('Yüksek oranda koyu geçirimsiz yüzeyler ısı birikimine yol açıyor');
  if (vegetationCooling < 30) weaknesses.push('Etkin soğutma için ağaç gölgesi ve yeşil örtü yetersiz kalıyor');
  if (waterRegulation < 25) weaknesses.push('Su unsurlarının yokluğu buharlaşmalı soğutma potansiyelini kısıtlıyor');
  if (morphologyRisk >= 60) weaknesses.push('Yoğun yapı kütlesi hava akışını engelliyor ve ısıyı hapsediyor');
  if ((categoryBreakdown['impervious'] || 0) >= 40) weaknesses.push('Geniş yol ve otopark yüzeyleri birbirine bağlı ısı koridorları oluşturuyor');

  // Opportunities
  if (surfaceHeatLoad >= 55) opportunities.push('Geçirimsiz yüzeyler geçirgen veya yansıtıcı malzemelerle yenilenebilir');
  if (vegetationCooling < 50) opportunities.push('Cadde boyunca doğrusal ağaç dikimi gölgeleme koridoru yaratabilir');
  if (waterRegulation < 30) opportunities.push('Açık alanlara su unsurları veya biyosuya kanalları eklenebilir');
  if ((categoryBreakdown['building'] || 0) >= 30) opportunities.push('Mevcut binalarda yeşil çatı ve duvar uygulaması potansiyeli var');
  opportunities.push('Düşük yoğunluklu boşluklara cep park eklemeleri anlık soğutma odakları oluşturabilir');
  if (morphologyRisk >= 50) opportunities.push('Rüzgar koridoru analizi havalandırma iyileştirme noktalarını belirleyebilir');

  // Threats
  if (surfaceHeatLoad >= 60) threats.push('Yaya bölgelerinde ısı dalgası döneminde termal konfor riski yüksek');
  if (morphologyRisk >= 55) threats.push('Yoğun yapı kütlesi gece ısı tutarak kentsel ısı adasını güçlendiriyor');
  if ((categoryBreakdown['impervious'] || 0) >= 35) threats.push('Düşük geçirgenlik yağmur döneminde hem sel hem ısı riskini artırıyor');
  threats.push('Yapılaşma baskısıyla yeşil örtünün giderek azalması UHI\'yı daha da kötüleştirebilir');
  if (input.uhiScore >= 60) threats.push('Artan kentsel ısı, müdahale olmadan açık alan kullanımını kısıtlayabilir');

  return { strengths, weaknesses, opportunities, threats };
}
