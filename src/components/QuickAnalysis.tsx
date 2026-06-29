import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import { analyzeArea, BBox, AnalysisResult } from '../utils/osmAnalysis';
import { getRiskLevel } from '../utils/climateParameters';
import UHIBarometer from './UHIBarometer';
import './QuickAnalysis.css';

const RLMapContainer: any = MapContainer as any;
const RLTileLayer: any = TileLayer as any;
const RLRectangle: any = Rectangle as any;
const RLMarker: any = Marker as any;

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type DrawState = 'idle' | 'first_click' | 'done';

interface DrawHandlerProps {
  drawState: DrawState;
  onFirstClick: (lat: number, lon: number) => void;
  onSecondClick: (lat: number, lon: number) => void;
  onMouseMove: (lat: number, lon: number) => void;
}

const DrawHandler: React.FC<DrawHandlerProps> = ({ drawState, onFirstClick, onSecondClick, onMouseMove }) => {
  const map = useMapEvents({
    click(e: any) {
      if (drawState === 'idle') onFirstClick(e.latlng.lat, e.latlng.lng);
      else if (drawState === 'first_click') onSecondClick(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e: any) {
      if (drawState === 'first_click') onMouseMove(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    if (drawState === 'idle') container.style.cursor = 'crosshair';
    else if (drawState === 'first_click') container.style.cursor = 'crosshair';
    else container.style.cursor = '';
    return () => { container.style.cursor = ''; };
  }, [map, drawState]);

  return null;
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  building:   { label: 'Buildings',         color: '#1e293b' },
  impervious: { label: 'Roads & Paved',     color: '#6b7280' },
  semi_perm:  { label: 'Semi-Permeable',    color: '#84cc16' },
  vegetation: { label: 'Green Areas',       color: '#22c55e' },
  water:      { label: 'Water Bodies',      color: '#0ea5e9' },
  unknown:    { label: 'Unclassified',      color: '#94a3b8' },
};

const SUB_SCORE_LABELS: Record<string, { label: string; higherIsBetter: boolean }> = {
  surfaceHeatLoad:      { label: 'Surface Heat Load',      higherIsBetter: false },
  vegetationCooling:    { label: 'Vegetation Cooling',     higherIsBetter: true },
  waterRegulation:      { label: 'Water Regulation',       higherIsBetter: true },
  morphologyRisk:       { label: 'Morphology Risk',        higherIsBetter: false },
  anthropogenicPressure:{ label: 'Urban Pressure',         higherIsBetter: false },
};

interface Props {
  onClose: () => void;
}

const QuickAnalysis: React.FC<Props> = ({ onClose }) => {
  const [locationSearch, setLocationSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.015, 28.979]);
  const [mapKey, setMapKey] = useState(0);

  const [drawState, setDrawState] = useState<DrawState>('idle');
  const [corner1, setCorner1] = useState<[number, number] | null>(null);
  const [corner2, setCorner2] = useState<[number, number] | null>(null);
  const [previewCorner, setPreviewCorner] = useState<[number, number] | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getBbox = useCallback((c1: [number, number], c2: [number, number]): BBox => ({
    south: Math.min(c1[0], c2[0]),
    north: Math.max(c1[0], c2[0]),
    west:  Math.min(c1[1], c2[1]),
    east:  Math.max(c1[1], c2[1]),
  }), []);

  const rectBounds = useMemo(() => {
    const c2 = corner2 ?? previewCorner;
    if (!corner1 || !c2) return null;
    const bbox = getBbox(corner1, c2);
    return [[bbox.south, bbox.west], [bbox.north, bbox.east]] as [[number, number], [number, number]];
  }, [corner1, corner2, previewCorner, getBbox]);

  const handleFirstClick = (lat: number, lon: number) => {
    setCorner1([lat, lon]);
    setCorner2(null);
    setPreviewCorner(null);
    setResult(null);
    setError(null);
    setDrawState('first_click');
  };

  const handleSecondClick = (lat: number, lon: number) => {
    setCorner2([lat, lon]);
    setPreviewCorner(null);
    setDrawState('done');
  };

  const handleMouseMove = (lat: number, lon: number) => {
    setPreviewCorner([lat, lon]);
  };

  const handleReset = () => {
    setDrawState('idle');
    setCorner1(null);
    setCorner2(null);
    setPreviewCorner(null);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!corner1 || !corner2) return;
    const bbox = getBbox(corner1, corner2);
    const area = (bbox.north - bbox.south) * (bbox.east - bbox.west);
    if (area > 0.01) {
      setError('Selected area is too large. Please draw a smaller rectangle (city block to neighbourhood scale).');
      return;
    }
    if (area < 0.000001) {
      setError('Selected area is too small. Please draw a larger rectangle.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeArea(bbox);
      setResult(res);
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('timeout');
      const isNetwork = err?.message?.includes('fetch') || err?.message?.includes('network') || err?.name === 'TypeError';
      setError(
        isAbort
          ? 'Request timed out. The area may be too complex or the service is busy. Try again.'
          : isNetwork
          ? 'Could not reach the OpenStreetMap data service. Make sure you have internet access and try again. (If using a local dev environment, this may be a sandbox restriction.)'
          : `Analysis failed: ${err?.message ?? 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch.trim())}&limit=1`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'narch-app/1.0' } }
      );
      const data = await res.json();
      if (data?.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setMapKey(k => k + 1);
        handleReset();
      } else {
        setError('Location not found.');
      }
    } catch {
      setError('Location search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const riskLevel = result ? getRiskLevel(result.uhiScore) : null;

  const drawInstruction =
    drawState === 'idle' ? 'Click on the map to set the first corner of your analysis area' :
    drawState === 'first_click' ? 'Click again to set the second corner' :
    'Area selected — click Analyze or Reset to start over';

  return (
    <div className="qa-overlay">
      <div className="qa-container">
        {/* Header */}
        <div className="qa-header">
          <div className="qa-header-left">
            <span className="qa-badge">Free Analysis</span>
            <h2 className="qa-title">Quick Climate Pre-Diagnosis</h2>
            <p className="qa-subtitle">Select an area on the map to get an instant Urban Heat Island risk assessment</p>
          </div>
          <button className="qa-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="qa-body">
          {/* Map column */}
          <div className="qa-map-col">
            <form className="qa-search-form" onSubmit={handleLocationSearch}>
              <input
                className="qa-search-input"
                placeholder="Search location (e.g. Beyoğlu, Istanbul)…"
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
              />
              <button className="qa-search-btn" type="submit" disabled={isSearching}>
                {isSearching ? '…' : 'Search'}
              </button>
            </form>

            <div className="qa-map-wrapper">
              <RLMapContainer key={mapKey} center={mapCenter} zoom={14}
                style={{ width: '100%', height: '100%' }} scrollWheelZoom>
                <RLTileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DrawHandler
                  drawState={drawState}
                  onFirstClick={handleFirstClick}
                  onSecondClick={handleSecondClick}
                  onMouseMove={handleMouseMove}
                />
                {corner1 && drawState === 'first_click' && !previewCorner && (
                  <RLMarker position={corner1} icon={markerIcon} />
                )}
                {rectBounds && (
                  <RLRectangle
                    bounds={rectBounds}
                    pathOptions={{
                      color: drawState === 'done' ? '#3b82f6' : '#94a3b8',
                      weight: 2,
                      fillOpacity: drawState === 'done' ? 0.12 : 0.06,
                      dashArray: drawState === 'done' ? undefined : '6 4',
                    }}
                  />
                )}
              </RLMapContainer>
            </div>

            <div className="qa-draw-bar">
              <span className="qa-draw-hint">{drawInstruction}</span>
              <div className="qa-draw-actions">
                <button className="qa-btn-secondary" onClick={handleReset} disabled={drawState === 'idle'}>
                  Reset
                </button>
                <button
                  className="qa-btn-primary"
                  onClick={handleAnalyze}
                  disabled={drawState !== 'done' || isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing…' : 'Analyze Area'}
                </button>
              </div>
            </div>

            {error && <div className="qa-error">{error}</div>}
          </div>

          {/* Results column */}
          <div className="qa-results-col">
            {!result && !isAnalyzing && (
              <div className="qa-empty-state">
                <div className="qa-empty-icon">🗺️</div>
                <p>Draw a rectangle on the map and click <strong>Analyze Area</strong> to see the UHI risk score and SWOT analysis.</p>
                <p className="qa-empty-sub">Data is sourced live from OpenStreetMap.</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="qa-loading">
                <div className="qa-spinner" />
                <p>Fetching OSM data and computing climate scores…</p>
              </div>
            )}

            {result && riskLevel && (
              <div className="qa-result-content">
                {/* Barometer */}
                <div className="qa-barometer-section">
                  <div className="qa-barometer-wrap">
                    <UHIBarometer score={result.uhiScore} />
                    <div className="qa-score-center">
                      <span className="qa-score-value" style={{ color: riskLevel.color }}>
                        {result.uhiScore}
                      </span>
                      <span className="qa-score-label" style={{ color: riskLevel.color }}>
                        {riskLevel.label}
                      </span>
                    </div>
                  </div>
                  <p className="qa-risk-desc">{riskLevel.description}</p>
                  <p className="qa-feature-note">{result.featureCount} OSM features analysed</p>
                </div>

                {/* Sub-scores */}
                <div className="qa-subscores">
                  <h4 className="qa-section-title">Sub-Scores</h4>
                  {Object.entries(result.subScores).map(([key, val]) => {
                    const meta = SUB_SCORE_LABELS[key];
                    const good = meta?.higherIsBetter ?? false;
                    const barColor = good
                      ? `hsl(${val * 1.2}, 70%, 45%)`
                      : `hsl(${(100 - val) * 1.2}, 70%, 45%)`;
                    return (
                      <div key={key} className="qa-subscore-row">
                        <span className="qa-subscore-label">{meta?.label ?? key}</span>
                        <div className="qa-subscore-bar-bg">
                          <div className="qa-subscore-bar" style={{ width: `${val}%`, background: barColor }} />
                        </div>
                        <span className="qa-subscore-val">{val}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Surface breakdown */}
                <div className="qa-breakdown">
                  <h4 className="qa-section-title">Surface Breakdown</h4>
                  <div className="qa-breakdown-bars">
                    {Object.entries(result.categoryBreakdown)
                      .filter(([, pct]) => pct > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, pct]) => {
                        const meta = CATEGORY_LABELS[cat] ?? { label: cat, color: '#94a3b8' };
                        return (
                          <div key={cat} className="qa-breakdown-row">
                            <span className="qa-breakdown-dot" style={{ background: meta.color }} />
                            <span className="qa-breakdown-label">{meta.label}</span>
                            <div className="qa-breakdown-bar-bg">
                              <div className="qa-breakdown-bar"
                                style={{ width: `${Math.min(pct, 100)}%`, background: meta.color }} />
                            </div>
                            <span className="qa-breakdown-pct">{pct}%</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* SWOT */}
                <div className="qa-swot">
                  <h4 className="qa-section-title">SWOT Analysis</h4>
                  <div className="qa-swot-grid">
                    <SwotCard title="Strengths" icon="✦" items={result.swot.strengths} type="strength" />
                    <SwotCard title="Weaknesses" icon="✗" items={result.swot.weaknesses} type="weakness" />
                    <SwotCard title="Opportunities" icon="→" items={result.swot.opportunities} type="opportunity" />
                    <SwotCard title="Threats" icon="!" items={result.swot.threats} type="threat" />
                  </div>
                </div>

                <div className="qa-premium-cta">
                  <p>Want physics-based simulation, scenario generation and exportable reports?</p>
                  <button className="qa-btn-primary" onClick={onClose}>Explore Premium →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SwotCardProps {
  title: string;
  icon: string;
  items: string[];
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
}

const SwotCard: React.FC<SwotCardProps> = ({ title, icon, items, type }) => (
  <div className={`qa-swot-card qa-swot-${type}`}>
    <div className="qa-swot-header">
      <span className="qa-swot-icon">{icon}</span>
      <h5>{title}</h5>
    </div>
    <ul className="qa-swot-list">
      {items.length > 0
        ? items.map((item, i) => <li key={i}>{item}</li>)
        : <li className="qa-swot-empty">None identified</li>
      }
    </ul>
  </div>
);

export default QuickAnalysis;
