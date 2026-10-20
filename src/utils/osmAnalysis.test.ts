import { analyzeArea } from './osmAnalysis';

function mockOverpassElements(elements: any[]) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ elements }),
  });
}

describe('osmAnalysis surface and gap classification', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('keeps completely unmapped selections unknown instead of inventing gravel', async () => {
    mockOverpassElements([]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.default).toBe(100);
    expect(result.categoryBreakdown.unknown).toBe(100);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
  });

  it('uses local campus context as open green fallback when mapped garden geometry is missing', async () => {
    mockOverpassElements([
      {
        type: 'area',
        tags: { amenity: 'university', name: 'Campus' },
        center: { lat: 0.5, lon: 0.5 },
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.surface_grass).toBe(100);
    expect(result.keyBreakdown.default ?? 0).toBe(0);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
  });

  it('ignores far-away is_in green context instead of treating it as the selected area', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { landuse: 'forest' },
        center: { lat: -22.4694, lon: -104.3536 },
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.default).toBe(100);
    expect(result.keyBreakdown.landuse_forest ?? 0).toBe(0);
  });

  it('treats hard pedestrian context as urban paving for gap fill', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { highway: 'pedestrian' },
        geometry: [
          { lat: 0.1, lon: 0.1 },
          { lat: 0.1, lon: 0.5 },
          { lat: 0.5, lon: 0.5 },
          { lat: 0.5, lon: 0.1 },
          { lat: 0.1, lon: 0.1 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.highway_footway).toBeGreaterThan(0);
    expect(result.keyBreakdown.surface_paving).toBeGreaterThan(70);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
  });

  it('does not let sparse mapped park paths turn the whole selection into paving', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { highway: 'footway' },
        geometry: [
          { lat: 0.48, lon: 0.1 },
          { lat: 0.52, lon: 0.9 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.surface_grass).toBeGreaterThan(90);
    expect(result.keyBreakdown.surface_paving ?? 0).toBe(0);
  });

  it('does not let sparse tree nodes turn an urban square gap into mostly grass', async () => {
    mockOverpassElements([
      {
        type: 'node',
        tags: { natural: 'tree' },
      },
      {
        type: 'node',
        tags: { natural: 'tree' },
      },
      {
        type: 'way',
        tags: { highway: 'pedestrian' },
        geometry: [
          { lat: 0.2, lon: 0.2 },
          { lat: 0.2, lon: 0.5 },
          { lat: 0.5, lon: 0.5 },
          { lat: 0.5, lon: 0.2 },
          { lat: 0.2, lon: 0.2 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.surface_grass ?? 0).toBe(0);
    expect(result.keyBreakdown.surface_paving).toBeGreaterThan(50);
  });

  it('uses enclosing green context to fill untagged park selections as vegetation', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { leisure: 'park' },
        geometry: [
          { lat: -0.1, lon: -0.1 },
          { lat: -0.1, lon: 1.1 },
          { lat: 1.1, lon: 1.1 },
          { lat: 1.1, lon: -0.1 },
          { lat: -0.1, lon: -0.1 },
        ],
      },
      {
        type: 'way',
        tags: { highway: 'footway' },
        geometry: [
          { lat: 0.48, lon: 0.1 },
          { lat: 0.52, lon: 0.9 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.leisure_park).toBeGreaterThan(50);
    expect(result.keyBreakdown.surface_grass).toBeGreaterThan(30);
    expect(result.categoryBreakdown.vegetation).toBe(100);
  });

  it('uses containing Overpass areas when the park polygon nodes are outside the selection', async () => {
    mockOverpassElements([
      {
        type: 'area',
        tags: { leisure: 'park', name: 'Large Park' },
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.leisure_park).toBeGreaterThan(50);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
    expect(result.categoryBreakdown.vegetation).toBe(100);
  });

  it('uses geometryless green context ways only when the selected area has almost no mapped features', async () => {
    mockOverpassElements([
      {
        type: 'way',
        id: 42156282,
        tags: { landuse: 'forest', leaf_type: 'broadleaved' },
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.landuse_forest).toBeGreaterThan(50);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
    expect(result.categoryBreakdown.vegetation).toBe(100);
  });

  it('does not leak nearby geometryless park context into mapped station selections', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { landuse: 'forest', leaf_type: 'broadleaved' },
      },
      {
        type: 'way',
        tags: { building: 'roof' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 0.4, lon: 1 },
          { lat: 0.4, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
      {
        type: 'way',
        tags: { highway: 'primary' },
        geometry: [
          { lat: 0.45, lon: 0 },
          { lat: 0.45, lon: 1 },
          { lat: 0.65, lon: 1 },
          { lat: 0.65, lon: 0 },
          { lat: 0.45, lon: 0 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.landuse_forest ?? 0).toBe(0);
    expect(result.keyBreakdown.roof_metal).toBeGreaterThan(0);
    expect(result.keyBreakdown.highway_primary).toBeGreaterThan(0);
  });

  it('uses nearby coastline context as water when a sea selection has no mapped features', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { natural: 'coastline' },
        geometry: [
          { lat: 0.2, lon: -0.2 },
          { lat: 0.8, lon: -0.2 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.natural_water).toBeGreaterThan(50);
    expect(result.keyBreakdown.surface_unpaved ?? 0).toBe(0);
    expect(result.categoryBreakdown.water).toBe(100);
  });

  it('does not leak coastline water context into mapped land selections', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { natural: 'coastline' },
        geometry: [
          { lat: 0.2, lon: -0.2 },
          { lat: 0.8, lon: -0.2 },
        ],
      },
      {
        type: 'way',
        tags: { building: 'roof' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 0.4, lon: 1 },
          { lat: 0.4, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.natural_water ?? 0).toBe(0);
    expect(result.keyBreakdown.roof_metal).toBeGreaterThan(0);
  });

  it('classifies granite and marble surface tags as hard paving', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { surface: 'Granite;marble' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 1, lon: 1 },
          { lat: 1, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.surface_paving).toBe(100);
    expect(result.categoryBreakdown.semi_perm).toBe(100);
  });

  it('classifies explicit roof structures as metal roofs', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { building: 'roof' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 1, lon: 1 },
          { lat: 1, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.roof_metal).toBeGreaterThan(50);
    expect(result.keyBreakdown.roof_tiles ?? 0).toBe(0);
  });

  it('classifies covered railway platforms as metal roofs without treating every platform as metal', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { railway: 'platform', covered: 'yes' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 0.4 },
          { lat: 0.4, lon: 0.4 },
          { lat: 0.4, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
      {
        type: 'way',
        tags: { railway: 'platform' },
        geometry: [
          { lat: 0.6, lon: 0.6 },
          { lat: 0.6, lon: 0.8 },
          { lat: 0.8, lon: 0.8 },
          { lat: 0.8, lon: 0.6 },
          { lat: 0.6, lon: 0.6 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.roof_metal).toBeGreaterThan(0);
    expect(result.keyBreakdown.default ?? 0).toBeGreaterThan(0);
  });

  it('does not classify broad university grounds as concrete roof', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { landuse: 'university' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 1, lon: 1 },
          { lat: 1, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.keyBreakdown.landuse_institutional).toBeGreaterThan(0);
    expect(result.keyBreakdown.surface_paving).toBeGreaterThan(0);
    expect(result.keyBreakdown.landuse_commercial ?? 0).toBe(0);
    expect(result.keyBreakdown.roof_concrete ?? 0).toBe(0);
    expect(result.categoryBreakdown.building ?? 0).toBe(0);
    expect(result.categoryBreakdown.semi_perm).toBe(100);
  });

  it('tailors SWOT to open institutional green areas instead of generic street advice', async () => {
    mockOverpassElements([
      {
        type: 'way',
        tags: { landuse: 'university' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 1 },
          { lat: 1, lon: 1 },
          { lat: 1, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
      {
        type: 'way',
        tags: { landuse: 'grass' },
        geometry: [
          { lat: 0.2, lon: 0.2 },
          { lat: 0.2, lon: 0.8 },
          { lat: 0.8, lon: 0.8 },
          { lat: 0.8, lon: 0.2 },
          { lat: 0.2, lon: 0.2 },
        ],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.swot.strengths.some(item => item.includes('kampüs'))).toBe(true);
    expect(result.swot.opportunities.some(item => item.includes('Açık kampüs'))).toBe(true);
    expect(result.swot.opportunities.some(item => item.includes('Cadde boyunca'))).toBe(false);
    expect(result.swot.threats.some(item => item.includes('kampüs'))).toBe(true);
  });

  it('retries next mirror when Overpass returns a runtime timeout remark with empty elements', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remark: 'runtime error: Query timed out in "query" at line 12 after 25 seconds.',
          elements: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          elements: [
            {
              type: 'way',
              id: 101,
              tags: { building: 'apartments', 'building:levels': '6' },
              geometry: [
                { lat: 0, lon: 0 },
                { lat: 0, lon: 0.5 },
                { lat: 0.5, lon: 0.5 },
                { lat: 0.5, lon: 0 },
                { lat: 0, lon: 0 },
              ],
            },
          ],
        }),
      });

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.keyBreakdown.roof_concrete).toBeGreaterThan(0);
    expect(result.categoryBreakdown.unknown ?? 0).toBe(0);
  });

  it('deduplicates ways returned in both primary geometry and context center blocks', async () => {
    mockOverpassElements([
      {
        type: 'way',
        id: 555,
        tags: { leisure: 'park' },
        geometry: [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 0.2 },
          { lat: 0.2, lon: 0.2 },
          { lat: 0.2, lon: 0 },
          { lat: 0, lon: 0 },
        ],
      },
      {
        type: 'way',
        id: 555,
        tags: { leisure: 'park' },
        center: { lat: 0.1, lon: 0.1 },
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.featureCount).toBe(1);
    expect(result.keyBreakdown.leisure_park).toBeGreaterThan(0);
  });

  it('normalizes OSM API v0.6 map.json node-referenced ways and multipolygon relations', async () => {
    mockOverpassElements([
      { type: 'node', id: 1, lat: 0, lon: 0 },
      { type: 'node', id: 2, lat: 0, lon: 0.6 },
      { type: 'node', id: 3, lat: 0.6, lon: 0.6 },
      { type: 'node', id: 4, lat: 0.6, lon: 0 },
      { type: 'node', id: 99, lat: 0.2, lon: 0.2, tags: { natural: 'tree', leaf_cycle: 'deciduous' } },
      { type: 'node', id: 100, lat: 0.3, lon: 0.3, tags: { shop: 'bakery' } },
      {
        type: 'way',
        id: 10,
        nodes: [1, 2, 3, 4, 1],
      },
      {
        type: 'relation',
        id: 20,
        tags: { type: 'multipolygon', building: 'commercial' },
        members: [{ type: 'way', ref: 10, role: 'outer' }],
      },
    ]);

    const result = await analyzeArea({ south: 0, west: 0, north: 1, east: 1 });

    expect(result.featureCount).toBe(2); // 1 resolved building way + 1 tree node (shop node & vertex nodes ignored)
    expect(result.keyBreakdown.roof_concrete).toBeGreaterThan(20);
  });
});
