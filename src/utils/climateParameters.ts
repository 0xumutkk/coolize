export interface FeatureParams {
  heatLoad: number;        // 0-1, how much this feature contributes to UHI
  coolingPotential: number; // 0-1, how much this feature cools
  morphologyImpact: number; // 0-1, how much this blocks ventilation
  category: 'building' | 'impervious' | 'semi_perm' | 'vegetation' | 'water' | 'unknown';
}

export const OSM_PARAMETER_MAP: Record<string, FeatureParams> = {
  building:             { heatLoad: 0.85, coolingPotential: 0.05, morphologyImpact: 0.80, category: 'building' },

  highway_primary:      { heatLoad: 0.90, coolingPotential: 0.05, morphologyImpact: 0.40, category: 'impervious' },
  highway_secondary:    { heatLoad: 0.85, coolingPotential: 0.05, morphologyImpact: 0.35, category: 'impervious' },
  highway_tertiary:     { heatLoad: 0.80, coolingPotential: 0.05, morphologyImpact: 0.30, category: 'impervious' },
  highway_residential:  { heatLoad: 0.75, coolingPotential: 0.05, morphologyImpact: 0.25, category: 'impervious' },
  highway_service:      { heatLoad: 0.70, coolingPotential: 0.05, morphologyImpact: 0.20, category: 'impervious' },
  highway_footway:      { heatLoad: 0.45, coolingPotential: 0.10, morphologyImpact: 0.05, category: 'semi_perm' },

  landuse_forest:       { heatLoad: 0.05, coolingPotential: 0.90, morphologyImpact: 0.00, category: 'vegetation' },
  landuse_grass:        { heatLoad: 0.10, coolingPotential: 0.55, morphologyImpact: 0.00, category: 'vegetation' },
  landuse_meadow:       { heatLoad: 0.10, coolingPotential: 0.50, morphologyImpact: 0.00, category: 'vegetation' },
  landuse_commercial:   { heatLoad: 0.80, coolingPotential: 0.05, morphologyImpact: 0.50, category: 'building' },
  landuse_industrial:   { heatLoad: 0.85, coolingPotential: 0.03, morphologyImpact: 0.45, category: 'building' },
  landuse_retail:       { heatLoad: 0.80, coolingPotential: 0.05, morphologyImpact: 0.45, category: 'building' },
  landuse_residential:  { heatLoad: 0.60, coolingPotential: 0.20, morphologyImpact: 0.40, category: 'building' },
  landuse_parking:      { heatLoad: 0.88, coolingPotential: 0.02, morphologyImpact: 0.20, category: 'impervious' },

  natural_tree:         { heatLoad: 0.05, coolingPotential: 0.85, morphologyImpact: 0.00, category: 'vegetation' },
  natural_wood:         { heatLoad: 0.05, coolingPotential: 0.90, morphologyImpact: 0.00, category: 'vegetation' },
  natural_scrub:        { heatLoad: 0.15, coolingPotential: 0.45, morphologyImpact: 0.00, category: 'vegetation' },
  natural_grassland:    { heatLoad: 0.12, coolingPotential: 0.50, morphologyImpact: 0.00, category: 'vegetation' },
  natural_water:        { heatLoad: 0.20, coolingPotential: 0.50, morphologyImpact: 0.00, category: 'water' },
  natural_wetland:      { heatLoad: 0.15, coolingPotential: 0.55, morphologyImpact: 0.00, category: 'water' },

  leisure_park:         { heatLoad: 0.10, coolingPotential: 0.65, morphologyImpact: 0.00, category: 'vegetation' },
  leisure_garden:       { heatLoad: 0.10, coolingPotential: 0.60, morphologyImpact: 0.00, category: 'vegetation' },
  leisure_pitch:        { heatLoad: 0.15, coolingPotential: 0.45, morphologyImpact: 0.00, category: 'vegetation' },

  waterway_river:       { heatLoad: 0.18, coolingPotential: 0.55, morphologyImpact: 0.00, category: 'water' },
  waterway_stream:      { heatLoad: 0.20, coolingPotential: 0.45, morphologyImpact: 0.00, category: 'water' },
  waterway_canal:       { heatLoad: 0.20, coolingPotential: 0.45, morphologyImpact: 0.00, category: 'water' },

  // ── Surface material types (from OSM surface=* tag) ──────────────────────────
  // Dark impervious — highest heat load
  surface_asphalt:      { heatLoad: 0.93, coolingPotential: 0.02, morphologyImpact: 0.05, category: 'impervious' },
  surface_concrete:     { heatLoad: 0.80, coolingPotential: 0.05, morphologyImpact: 0.05, category: 'impervious' },
  // Semi-permeable hard surfaces
  surface_paving:       { heatLoad: 0.65, coolingPotential: 0.10, morphologyImpact: 0.03, category: 'semi_perm' },
  surface_gravel:       { heatLoad: 0.38, coolingPotential: 0.22, morphologyImpact: 0.00, category: 'semi_perm' },
  surface_sand:         { heatLoad: 0.30, coolingPotential: 0.18, morphologyImpact: 0.00, category: 'semi_perm' },
  surface_unpaved:      { heatLoad: 0.28, coolingPotential: 0.25, morphologyImpact: 0.00, category: 'semi_perm' },
  surface_wood_deck:    { heatLoad: 0.42, coolingPotential: 0.15, morphologyImpact: 0.00, category: 'semi_perm' },
  // Soft / vegetation-type surfaces
  surface_grass:        { heatLoad: 0.10, coolingPotential: 0.55, morphologyImpact: 0.00, category: 'vegetation' },
  surface_dirt:         { heatLoad: 0.20, coolingPotential: 0.30, morphologyImpact: 0.00, category: 'semi_perm' },
  // Tree detail types (from leaf_type / leaf_cycle tags)
  tree_deciduous:       { heatLoad: 0.05, coolingPotential: 0.90, morphologyImpact: 0.00, category: 'vegetation' },
  tree_evergreen:       { heatLoad: 0.05, coolingPotential: 0.85, morphologyImpact: 0.00, category: 'vegetation' },
  tree_mixed:           { heatLoad: 0.05, coolingPotential: 0.87, morphologyImpact: 0.00, category: 'vegetation' },

  // ── Roof material types (from OSM roof:material=* tag) ──────────────────────
  // Kiremit (terracotta / clay tile) — dominant in Turkish residential areas
  roof_tiles:           { heatLoad: 0.62, coolingPotential: 0.10, morphologyImpact: 0.80, category: 'building' },
  // Flat reinforced-concrete slab — common in commercial & multi-storey buildings
  roof_concrete:        { heatLoad: 0.82, coolingPotential: 0.03, morphologyImpact: 0.80, category: 'building' },
  // Corrugated steel / metal sheet — warehouses, industrial sheds
  roof_metal:           { heatLoad: 0.88, coolingPotential: 0.02, morphologyImpact: 0.80, category: 'building' },
  // Built-up asphalt / tar-paper flat roof
  roof_asphalt:         { heatLoad: 0.90, coolingPotential: 0.01, morphologyImpact: 0.80, category: 'building' },
  // Green / living roof (sedum, grass, soil substrate)
  roof_green:           { heatLoad: 0.15, coolingPotential: 0.72, morphologyImpact: 0.80, category: 'building' },
  // Natural slate or stone tile
  roof_slate:           { heatLoad: 0.58, coolingPotential: 0.08, morphologyImpact: 0.80, category: 'building' },
  // Glass or polycarbonate (greenhouses, atrium roofs)
  roof_glass:           { heatLoad: 0.70, coolingPotential: 0.05, morphologyImpact: 0.80, category: 'building' },

  default:              { heatLoad: 0.50, coolingPotential: 0.20, morphologyImpact: 0.20, category: 'unknown' },
};

export const SCORE_WEIGHTS = {
  surfaceHeatLoad: 0.35,
  morphologyRisk: 0.25,
  vegetationDeficit: 0.20,
  waterDeficit: 0.10,
  anthropogenicPressure: 0.10,
};

export const UHI_RISK_LEVELS = [
  { max: 30,  label: 'Düşük Risk',  color: '#3b82f6', description: 'Alanda iyi soğutma unsurları ve düşük ısı yükü mevcut.' },
  { max: 55,  label: 'Orta Risk',   color: '#f59e0b', description: 'Orta düzeyde UHI potansiyeli; bir miktar soğutma açığı var.' },
  { max: 75,  label: 'Yüksek Risk', color: '#f97316', description: 'Belirgin ısı baskısı. Müdahale önerilir.' },
  { max: 100, label: 'Kritik',      color: '#ef4444', description: 'Ağır UHI koşulları. Acil yeşillendirme gerekli.' },
];

export function getRiskLevel(score: number) {
  return UHI_RISK_LEVELS.find(l => score <= l.max) ?? UHI_RISK_LEVELS[UHI_RISK_LEVELS.length - 1];
}
