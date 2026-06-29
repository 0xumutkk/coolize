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

function classifyElement(tags: Record<string, string>): string {
  if (tags.building && tags.building !== 'no') return 'building';

  if (tags.highway) {
    const h = tags.highway;
    if (['motorway', 'trunk', 'primary'].includes(h)) return 'highway_primary';
    if (h === 'secondary') return 'highway_secondary';
    if (h === 'tertiary') return 'highway_tertiary';
    if (h === 'residential' || h === 'unclassified') return 'highway_residential';
    if (['footway', 'path', 'cycleway', 'pedestrian', 'steps'].includes(h)) return 'highway_footway';
    return 'highway_service';
  }

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

  if (tags.natural) {
    const n = tags.natural;
    if (n === 'tree') return 'natural_tree';
    if (n === 'wood' || n === 'scrubland') return 'natural_wood';
    if (n === 'scrub') return 'natural_scrub';
    if (n === 'grassland' || n === 'heath') return 'natural_grassland';
    if (n === 'water') return 'natural_water';
    if (n === 'wetland') return 'natural_wetland';
  }

  if (tags.leisure) {
    const l = tags.leisure;
    if (l === 'park' || l === 'nature_reserve') return 'leisure_park';
    if (l === 'garden') return 'leisure_garden';
    if (l === 'pitch' || l === 'sports_centre') return 'leisure_pitch';
  }

  if (tags.waterway) {
    const w = tags.waterway;
    if (w === 'river') return 'waterway_river';
    if (['stream', 'canal', 'drain', 'ditch'].includes(w)) return 'waterway_stream';
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

export async function analyzeArea(area: AnalysisArea): Promise<AnalysisResult> {
  const query = buildOverpassQuery(area);
  // Bounding box for area calculations
  const bbox: BBox = isBBox(area) ? area : polyToBBox(area.points);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (primaryErr: any) {
    console.error('[Narch] Primary Overpass endpoint failed:', primaryErr?.message ?? primaryErr);
    // Try fallback endpoint
    const fallbackUrl = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 35000);
    try {
      console.log('[Narch] Trying fallback Overpass endpoint…');
      response = await fetch(fallbackUrl, { signal: controller2.signal });
    } catch (fallbackErr: any) {
      console.error('[Narch] Fallback endpoint also failed:', fallbackErr?.message ?? fallbackErr);
      throw fallbackErr;
    } finally {
      clearTimeout(timeoutId2);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response!.ok) throw new Error(`Overpass API error: ${response!.status}`);

  const data = await response.json();
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

  // Uncovered area (roads/buildings often don't fill bbox): assume default semi-impervious
  const coveredRatio = Math.min(features.reduce((s, f) => s + f.areaDeg2, 0) / bboxArea, 1);
  const uncovered = 1 - coveredRatio;
  if (uncovered > 0) {
    heatLoadSum += 0.50 * uncovered;
    coolingSum += 0.20 * uncovered;
    morphSum += 0.10 * uncovered;
    categoryAreas['unknown'] = (categoryAreas['unknown'] || 0) + uncovered * bboxArea;
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
  if (vegetationCooling >= 50) strengths.push('Significant vegetation provides natural cooling and shade');
  if (waterRegulation >= 40) strengths.push('Water elements contribute to local evaporative cooling');
  if (morphologyRisk < 35) strengths.push('Open spatial structure supports natural ventilation corridors');
  if ((categoryBreakdown['vegetation'] || 0) >= 25) strengths.push('Above-average green coverage reduces heat load');
  if (surfaceHeatLoad < 40) strengths.push('Low impervious surface ratio limits heat absorption');

  // Weaknesses
  if (surfaceHeatLoad >= 65) weaknesses.push('High proportion of dark impervious surfaces drives heat accumulation');
  if (vegetationCooling < 30) weaknesses.push('Insufficient tree canopy and green cover for effective cooling');
  if (waterRegulation < 25) weaknesses.push('Absence of water elements limits evaporative cooling potential');
  if (morphologyRisk >= 60) weaknesses.push('Dense building mass restricts airflow and traps heat');
  if ((categoryBreakdown['impervious'] || 0) >= 40) weaknesses.push('Extensive road and parking surfaces form connected heat corridors');

  // Opportunities
  if (surfaceHeatLoad >= 55) opportunities.push('Retrofit impervious surfaces with permeable or reflective materials');
  if (vegetationCooling < 50) opportunities.push('Linear tree planting along streets to create shading corridors');
  if (waterRegulation < 30) opportunities.push('Introduce water features or bioswales in open spaces');
  if ((categoryBreakdown['building'] || 0) >= 30) opportunities.push('Green roof and wall potential on existing building stock');
  opportunities.push('Pocket park insertions at low-density gaps can generate immediate cooling nodes');
  if (morphologyRisk >= 50) opportunities.push('Wind corridor analysis to identify ventilation improvement points');

  // Threats
  if (surfaceHeatLoad >= 60) threats.push('Risk of thermal discomfort during heat waves in pedestrian zones');
  if (morphologyRisk >= 55) threats.push('Nocturnal heat retention from dense built mass');
  if ((categoryBreakdown['impervious'] || 0) >= 35) threats.push('Low permeability increases combined flood and heat risk during storms');
  threats.push('Progressive loss of green cover under development pressure may worsen UHI');
  if (input.uhiScore >= 60) threats.push('Increasing urban heat may reduce outdoor usability without intervention');

  return { strengths, weaknesses, opportunities, threats };
}
