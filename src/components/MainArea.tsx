import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CLASS_CONFIG } from '../utils/constants';
import Speedometer from './Speedometer';
import CanvasNavbar from './CanvasNavbar';
import CoolStrategies from './CoolStrategies';
import SaaSProducts from './SaaSProducts';
import UHIBarometer from './UHIBarometer';
import { analyzeArea, BBox, PolyArea, AnalysisResult } from '../utils/osmAnalysis';
import { getRiskLevel, OSM_PARAMETER_MAP } from '../utils/climateParameters';

type GridClass = keyof typeof CLASS_CONFIG;
type GridArray = GridClass[][];

// ─── QA draw types ────────────────────────────────────────────────────────────
type DrawState = 'idle' | 'first_click' | 'done';
type DrawMode  = 'rect' | 'poly' | null;

const RLMapContainer: any = MapContainer as any;
const RLTileLayer: any   = TileLayer as any;
const RLRectangle: any   = Rectangle as any;
const RLPolygon: any     = Polygon as any;

// ─── DrawHandler ─────────────────────────────────────────────────────────────
interface DrawHandlerProps {
  drawMode: DrawMode;
  drawState: DrawState;
  onFirstClick: (lat: number, lon: number) => void;
  onSecondClick: (lat: number, lon: number) => void;
  onMouseMove: (lat: number, lon: number) => void;
  onPolyPoint: (lat: number, lon: number) => void;
  onPolyClose: () => void;
  onPolyPreview: (lat: number, lon: number) => void;
  polyPoints: [number, number][];
}

const DrawHandler: React.FC<DrawHandlerProps> = ({
  drawMode, drawState,
  onFirstClick, onSecondClick, onMouseMove,
  onPolyPoint, onPolyClose, onPolyPreview, polyPoints,
}) => {
  const map = useMap() as any;
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag & cursor: disable pan while a draw mode is active
  useEffect(() => {
    if (drawMode !== null) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
    return () => { map.dragging.enable(); };
  }, [drawMode, map]);

  // Cursor: crosshair while drawing, default when done
  useEffect(() => {
    const el = map.getContainer();
    if (drawMode !== null && drawState !== 'done') {
      el.style.cursor = 'crosshair';
    } else {
      el.style.cursor = '';
    }
    return () => { el.style.cursor = ''; };
  }, [drawMode, drawState, map]);

  // Disable dbl-click zoom while poly drawing
  useEffect(() => {
    if (drawMode === 'poly' && drawState !== 'done') {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [drawMode, drawState, map]);

  useMapEvents({
    click(e: any) {
      if (drawMode === null) return;    // pan mode — ignore clicks
      if (drawState === 'done') return; // already finalized

      if (drawMode === 'rect') {
        if (drawState === 'idle') onFirstClick(e.latlng.lat, e.latlng.lng);
        else if (drawState === 'first_click') onSecondClick(e.latlng.lat, e.latlng.lng);
      } else {
        // Poly: snap-to-close when clicking near the first vertex (≤18 px)
        if (polyPoints.length >= 3) {
          const first = L.latLng(polyPoints[0][0], polyPoints[0][1]);
          const px0  = map.latLngToContainerPoint(first);
          const pxC  = map.latLngToContainerPoint(e.latlng);
          const dist = Math.hypot(px0.x - pxC.x, px0.y - pxC.y);
          if (dist <= 18) { onPolyClose(); return; }
        }
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => {
          onPolyPoint(e.latlng.lat, e.latlng.lng);
        }, 220);
      }
    },
    dblclick(e: any) {
      if (drawMode === 'poly' && drawState !== 'done' && polyPoints.length >= 3) {
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        onPolyClose();
        L.DomEvent.stop(e);
      }
    },
    mousemove(e: any) {
      if (drawState === 'done') return;
      if (drawMode === 'rect' && drawState === 'first_click') onMouseMove(e.latlng.lat, e.latlng.lng);
      if (drawMode === 'poly' && drawState === 'first_click') onPolyPreview(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

// ─── QA Location Search (inside MapContainer so useMap works) ────────────────
interface GeoResult { display_name: string; lat: string; lon: string; }

const MapFlyTo: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap() as any;
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target;
      map.flyTo(target, 15, { duration: 1 });
    }
  }, [map, target]);
  return null;
};

const QALocationSearch: React.FC<{
  onLocationFound: (name: string, lat: number, lon: number) => void;
}> = ({ onLocationFound }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const d: GeoResult[] = await r.json();
        setResults(d); setOpen(d.length > 0);
      } catch {}
      finally { setLoading(false); }
    }, 420);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (r: GeoResult) => {
    const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
    setFlyTarget([lat, lon]);
    onLocationFound(r.display_name.split(',')[0].trim(), lat, lon);
    setQuery(r.display_name.split(',')[0].trim());
    setOpen(false);
  };

  return (
    <>
      <MapFlyTo target={flyTarget} />
      <div className="qa-location-search" ref={wrapRef}>
        <div className="qa-search-input-wrap">
          <span className="qa-search-icon">⌕</span>
          <input
            type="text"
            className="qa-search-input"
            placeholder="Search location…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {loading && <span className="qa-search-spinner-icon" style={{ animation: 'qa-spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>}
        </div>
        {open && (
          <div className="qa-search-results">
            {results.map((r, i) => (
              <button key={i} className="qa-search-result-item" onClick={() => select(r)}>
                <span className="qa-result-main">{r.display_name.split(',')[0]}</span>
                <span className="qa-result-sub">{r.display_name.split(',').slice(1, 3).join(',').trim()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Draw Mode Toggle (inside map) ───────────────────────────────────────────
const QADrawModeControls: React.FC<{
  drawMode: DrawMode;
  onSetMode: (m: DrawMode) => void;
}> = ({ drawMode, onSetMode }) => (
  <div className="qa-draw-mode-controls">
    <button
      className={`qa-draw-mode-btn${drawMode === 'rect' ? ' active' : ''}`}
      onClick={() => onSetMode(drawMode === 'rect' ? null : 'rect')}
      title="Rectangle — click two corners"
    >▭ Rect</button>
    <button
      className={`qa-draw-mode-btn${drawMode === 'poly' ? ' active' : ''}`}
      onClick={() => onSetMode(drawMode === 'poly' ? null : 'poly')}
      title="Polygon — click vertices, dbl-click or click 1st point to close"
    >⬡ Poly</button>
  </div>
);

// ─── Fullscreen Compact Overlay ───────────────────────────────────────────────
interface QAFullscreenOverlayProps {
  result: AnalysisResult | null;
  drawState: DrawState;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onReset: () => void;
}
const QAFullscreenOverlay: React.FC<QAFullscreenOverlayProps> = ({
  result, drawState, isAnalyzing, onAnalyze, onReset,
}) => {
  if (!result) {
    return (
      <div className="qa-fs-overlay qa-fs-overlay--action">
        <button
          className="qa-fs-analyze-btn"
          onClick={onAnalyze}
          disabled={isAnalyzing || drawState !== 'done'}
        >
          {isAnalyzing ? (
            <><span className="qa-fs-spinner" />Analyzing…</>
          ) : (
            '⟳ Analyze Area'
          )}
        </button>
      </div>
    );
  }

  const risk = getRiskLevel(result.uhiScore);
  return (
    <div className="qa-fs-overlay">
      <div className="qa-fs-score-badge" style={{ borderColor: risk.color }}>
        <div className="qa-fs-score-num" style={{ color: risk.color }}>{result.uhiScore}</div>
        <div className="qa-fs-risk-label" style={{ color: risk.color }}>{risk.label}</div>
      </div>
      <div className="qa-fs-subscores">
        {Object.entries(result.subScores).map(([key, val]) => {
          const meta = SUB_SCORE_META[key];
          const good = meta?.higherIsBetter ?? false;
          const color = good
            ? `hsl(${val * 1.2},60%,42%)`
            : `hsl(${(100 - val) * 1.2},60%,42%)`;
          return (
            <div key={key} className="qa-fs-bar-row">
              <span className="qa-fs-bar-label">{meta?.label ?? key}</span>
              <div className="qa-fs-bar-track">
                <div className="qa-fs-bar-fill" style={{ width: `${val}%`, background: color }} />
              </div>
              <span className="qa-fs-bar-val">{val}</span>
            </div>
          );
        })}
      </div>
      <button className="qa-fs-reset-btn" onClick={onReset}>↺ Reset</button>
    </div>
  );
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  building:   { label: 'Buildings',      color: '#334155' },
  impervious: { label: 'Roads & Paved',  color: '#64748b' },
  semi_perm:  { label: 'Semi-Permeable', color: '#84cc16' },
  vegetation: { label: 'Green Areas',    color: '#22c55e' },
  water:      { label: 'Water Bodies',   color: '#0ea5e9' },
  unknown:    { label: 'Unclassified',   color: '#94a3b8' },
};

const OSM_KEY_LABELS: Record<string, string> = {
  building:            'Buildings',
  highway_primary:     'Primary Road',
  highway_secondary:   'Secondary Road',
  highway_tertiary:    'Tertiary Road',
  highway_residential: 'Residential Road',
  highway_service:     'Service Road',
  highway_footway:     'Footway / Path',
  landuse_forest:      'Forest',
  landuse_grass:       'Grass',
  landuse_meadow:      'Meadow',
  landuse_commercial:  'Commercial Area',
  landuse_industrial:  'Industrial Area',
  landuse_retail:      'Retail Area',
  landuse_residential: 'Residential Area',
  landuse_parking:     'Parking Lot',
  natural_tree:        'Urban Trees',
  natural_wood:        'Woodland',
  natural_scrub:       'Scrubland',
  natural_grassland:   'Grassland',
  natural_water:       'Open Water',
  natural_wetland:     'Wetland',
  leisure_park:        'Park / Reserve',
  leisure_garden:      'Garden',
  leisure_pitch:       'Sports Pitch',
  waterway_river:      'River',
  waterway_stream:     'Stream / Canal',
  waterway_canal:      'Canal',
  default:             'Unclassified',
};

// Map OSM key → category
const KEY_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(OSM_PARAMETER_MAP).map(([k, v]) => [k, v.category])
);

const SUB_SCORE_META: Record<string, { label: string; higherIsBetter: boolean }> = {
  surfaceHeatLoad:       { label: 'Surface Heat Load',    higherIsBetter: false },
  vegetationCooling:     { label: 'Vegetation Cooling',   higherIsBetter: true },
  waterRegulation:       { label: 'Water Regulation',     higherIsBetter: true },
  morphologyRisk:        { label: 'Morphology Risk',      higherIsBetter: false },
  anthropogenicPressure: { label: 'Urban Pressure',       higherIsBetter: false },
};

// ─── CanvasArea ───────────────────────────────────────────────────────────────
interface CanvasAreaProps {
  gridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageRef: React.RefObject<HTMLImageElement | null>;
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageSrc: string | null;
  isPainting: boolean;
  setIsPainting: (p: boolean) => void;
  paintAt: (x: number, y: number) => void;
  drawGridAndCells: () => void;
  gridSize: number;
  locationInfo?: string;
  // QA mode
  isQAMode: boolean;
  onToggleQA: () => void;
  mapCenter: [number, number];
  drawState: DrawState;
  drawMode: DrawMode;
  onSetDrawMode: (m: DrawMode) => void;
  corner1: [number, number] | null;
  corner2: [number, number] | null;
  previewCorner: [number, number] | null;
  onFirstClick: (lat: number, lon: number) => void;
  onSecondClick: (lat: number, lon: number) => void;
  onMouseMove: (lat: number, lon: number) => void;
  polyPoints: [number, number][];
  previewPoint: [number, number] | null;
  onPolyPoint: (lat: number, lon: number) => void;
  onPolyClose: () => void;
  onPolyPreview: (lat: number, lon: number) => void;
  mapKey: number;
  qaResult: AnalysisResult | null;
  onLocationFound: (name: string, lat: number, lon: number) => void;
  onAnalyze: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  gridCanvasRef, baseImageRef, fallbackCanvasRef, baseImageSrc,
  isPainting, setIsPainting, paintAt, drawGridAndCells, gridSize, locationInfo,
  isQAMode, onToggleQA, mapCenter, drawState, drawMode, onSetDrawMode,
  corner1, corner2, previewCorner, onFirstClick, onSecondClick, onMouseMove,
  polyPoints, previewPoint, onPolyPoint, onPolyClose, onPolyPreview,
  mapKey, qaResult, onLocationFound, onAnalyze, onReset, isAnalyzing,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQAFullscreen, setIsQAFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rectBounds = useMemo(() => {
    const c2 = corner2 ?? previewCorner;
    if (!corner1 || !c2) return null;
    return [
      [Math.min(corner1[0], c2[0]), Math.min(corner1[1], c2[1])],
      [Math.max(corner1[0], c2[0]), Math.max(corner1[1], c2[1])],
    ] as [[number, number], [number, number]];
  }, [corner1, corner2, previewCorner]);

  const pointerPos = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = gridCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const syncCanvasSize = useCallback(() => {
    if (containerRef.current && gridCanvasRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (gridCanvasRef.current.width !== w || gridCanvasRef.current.height !== h) {
        gridCanvasRef.current.width = w;
        gridCanvasRef.current.height = h;
        gridCanvasRef.current.style.width = w + 'px';
        gridCanvasRef.current.style.height = h + 'px';
      }
      if (!baseImageSrc && fallbackCanvasRef.current) {
        if (fallbackCanvasRef.current.width !== w || fallbackCanvasRef.current.height !== h) {
          fallbackCanvasRef.current.width = w;
          fallbackCanvasRef.current.height = h;
          fallbackCanvasRef.current.style.width = w + 'px';
          fallbackCanvasRef.current.style.height = h + 'px';
        }
        if (baseImageRef.current) baseImageRef.current.style.display = 'none';
        fallbackCanvasRef.current.style.display = 'block';
      }
      drawGridAndCells();
    }
  }, [baseImageSrc, baseImageRef, fallbackCanvasRef, gridCanvasRef, drawGridAndCells]);

  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;
    try {
      if (!isFullscreen) {
        await (fullscreenContainerRef.current.requestFullscreen?.() ??
          (fullscreenContainerRef.current as any).webkitRequestFullscreen?.());
      } else {
        await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => {
      const full = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(full);
      setIsQAFullscreen(full);
      if (full) setTimeout(syncCanvasSize, 100);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [syncCanvasSize]);

  const toggleQAFullscreen = async () => {
    const el = document.getElementById('qaMapInCanvas');
    if (!el) return;
    try {
      if (!isQAFullscreen) await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
      else await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
    } catch {}
  };

  useEffect(() => { syncCanvasSize(); }, [baseImageSrc, gridSize, syncCanvasSize]);
  useEffect(() => {
    const h = () => syncCanvasSize();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [syncCanvasSize]);

  const [rulerSize, setRulerSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setRulerSize({ width: r.width, height: r.height });
      }
    };
    const t = setTimeout(update, 100);
    const iv = setInterval(update, 200);
    window.addEventListener('resize', update);
    return () => { clearTimeout(t); clearInterval(iv); window.removeEventListener('resize', update); };
  }, [baseImageSrc, gridSize]);

  const renderRuler = (orientation: 'horizontal' | 'vertical') => {
    if (rulerSize.width === 0 || rulerSize.height === 0) return null;
    const isH = orientation === 'horizontal';
    const length = isH ? rulerSize.width : rulerSize.height;
    const rSize = 24;
    const cellsPerTick = Math.max(1, Math.floor(gridSize / 20));
    const cellSize = length / gridSize;
    const tickInterval = cellSize * cellsPerTick;
    const majorTickInterval = tickInterval * 5;
    const ticks = [];
    for (let i = 0; i <= length; i += tickInterval) {
      const isMajor = Math.abs(i % majorTickInterval) < tickInterval / 2 || i === 0 || i >= length - tickInterval / 2;
      ticks.push({ position: i, isMajor, label: isMajor ? Math.round((i / length) * gridSize) : null });
    }
    return (
      <div className={`ruler ${orientation}`} style={{ width: isH ? length : rSize, height: isH ? rSize : length }}>
        {ticks.map((t, idx) => (
          <div key={idx} className={`ruler-tick ${t.isMajor ? 'major' : 'minor'}`}
            style={isH ? { left: `${t.position}px` } : { top: `${t.position}px` }}>
            {t.label !== null && <span className="ruler-label">{t.label}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="canvasWrapper" ref={fullscreenContainerRef}>
      <CanvasNavbar
        locationInfo={locationInfo}
        isQAMode={isQAMode}
        onToggleQA={onToggleQA}
      />

      {isQAMode ? (
        /* ── QA: Leaflet map replaces canvas ── */
        <div id="qaMapInCanvas" style={{ position: 'relative' }}>
          {(() => {
            const polyPreviewLine = polyPoints.length > 0 && previewPoint && drawState !== 'done'
              ? [...polyPoints, previewPoint] : null;
            return (
              <RLMapContainer
                key={mapKey}
                center={mapCenter}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom
              >
                <RLTileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DrawHandler
                  drawMode={drawMode}
                  drawState={drawState}
                  onFirstClick={onFirstClick}
                  onSecondClick={onSecondClick}
                  onMouseMove={onMouseMove}
                  onPolyPoint={onPolyPoint}
                  onPolyClose={onPolyClose}
                  onPolyPreview={onPolyPreview}
                  polyPoints={polyPoints}
                />
                <QALocationSearch onLocationFound={onLocationFound} />
                <QADrawModeControls drawMode={drawMode} onSetMode={onSetDrawMode} />
                {drawMode === 'rect' && rectBounds && (
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
                {drawMode === 'poly' && polyPoints.length >= 2 && (
                  <RLPolygon
                    positions={polyPoints}
                    pathOptions={{
                      color: drawState === 'done' ? '#3b82f6' : '#94a3b8',
                      weight: 2,
                      fillOpacity: drawState === 'done' ? 0.12 : 0.04,
                      dashArray: drawState === 'done' ? undefined : '6 4',
                    }}
                  />
                )}
                {drawMode === 'poly' && polyPreviewLine && polyPreviewLine.length >= 2 && (
                  <RLPolygon
                    positions={polyPreviewLine}
                    pathOptions={{ color: '#94a3b8', weight: 1.5, fillOpacity: 0, dashArray: '4 4' }}
                  />
                )}
              </RLMapContainer>
            );
          })()}
          <button
            className="qa-map-fullscreen-btn"
            onClick={toggleQAFullscreen}
            title={isQAFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isQAFullscreen ? '⤓' : '⤢'}
          </button>
          {isQAFullscreen && (qaResult || drawState === 'done' || isAnalyzing) && (
            <QAFullscreenOverlay
              result={qaResult}
              drawState={drawState}
              isAnalyzing={isAnalyzing}
              onAnalyze={onAnalyze}
              onReset={onReset}
            />
          )}
        </div>
      ) : (
        /* ── Normal: rulers + canvas ── */
        <div id="canvasWithRulers">
          {renderRuler('horizontal')}
          <div id="canvasRulerContainer">
            {renderRuler('vertical')}
            <div id="canvasContainer" ref={containerRef}>
              <img id="baseImage" alt="Base map" ref={baseImageRef}
                src={baseImageSrc || undefined}
                style={{ display: baseImageSrc ? 'block' : 'none' }} />
              <canvas id="gridCanvas" ref={gridCanvasRef}
                onMouseDown={e => { setIsPainting(true); const p = pointerPos(e); paintAt(p.x, p.y); }}
                onMouseMove={e => { if (!isPainting) return; const p = pointerPos(e); paintAt(p.x, p.y); }}
                onMouseUp={() => setIsPainting(false)}
                onMouseLeave={() => setIsPainting(false)} />
              <canvas id="fallbackCanvas" ref={fallbackCanvasRef}
                style={{ display: baseImageSrc ? 'none' : 'block' }} />
              <button id="fullscreenBtn" onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className={isFullscreen ? 'fullscreen-active' : ''}>
                {isFullscreen ? '⤓' : '⤢'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ScoreData ────────────────────────────────────────────────────────────────
interface ScoreData { NEI: number; SWE: number; HEAT: number; TCI: number; BCI: number; UCIS: number; }

// ─── PercentsPanel (unchanged) ────────────────────────────────────────────────
interface PercentsPanelProps {
  percents: { [key in GridClass]: number };
  calculateButton?: React.ReactNode;
}
const PercentsPanel: React.FC<PercentsPanelProps> = ({ percents, calculateButton }) => {
  const percentRows = Object.entries(percents)
    .map(([key, value]) => ({ label: CLASS_CONFIG[key as GridClass]?.label || key, value: value || 0 }))
    .sort((a, b) => b.value - a.value);
  return (
    <div id="percentsPanel">
      <h3>Area Distribution</h3>
      <div className="percents-table-wrapper">
        <table>
          <thead><tr><th>Surface Type</th><th>Percentage</th></tr></thead>
          <tbody id="percentTableBody">
            {percentRows.map((row, i) => (
              <tr key={i}><td>{row.label}</td><td><strong>{row.value.toFixed(1)}%</strong></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {calculateButton && <div className="percents-calculate-wrapper">{calculateButton}</div>}
    </div>
  );
};

const SK_WIDTHS = ['85%', '60%', '72%', '48%', '65%'];

// ─── QA Skeleton — scores panel ──────────────────────────────────────────────
const SK_BARS = [
  { label: 75 }, { label: 50 }, { label: 62 }, { label: 40 }, { label: 55 },
];
const QASkeletonScores: React.FC = () => (
  <div id="scoresPanel">
    <h3>UHI Risk Score</h3>
    <div id="ucisSpeedometer">
      <div className="speedometer-container">
        <div className="sk-speedometer" />
      </div>
    </div>
    <div id="indexScores" style={{ marginTop: 8 }}>
      {SK_BARS.map((b, i) => (
        <div key={i} className="sk-bar-row">
          <div className="sk-line sk-bar-label" style={{ animationDelay: `${i * 0.12}s` }} />
          <div className="sk-bar-track">
            <div className="sk-bar-fill" style={{ width: `${b.label}%`, animationDelay: `${i * 0.12}s` }} />
          </div>
          <div className="sk-line" style={{ height: 10, width: 22, animationDelay: `${i * 0.12}s` }} />
        </div>
      ))}
    </div>
    <div className="strategies-section" style={{ marginTop: 20 }}>
      <h4 className="section-title">SWOT Analysis</h4>
      <div className="analysis-grid">
        {['strengths', 'weaknesses', 'opportunities', 'threats'].map(type => (
          <div key={type} className={`analysis-card ${type} sk-card`}>
            <div className="sk-line sk-card-title" />
            <div className="sk-line sk-card-line" style={{ width: '90%' }} />
            <div className="sk-line sk-card-line" style={{ width: '75%' }} />
            <div className="sk-line sk-card-line" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── QA Right Panel (replaces PercentsPanel in QA mode) ──────────────────────
interface QAPercentsPanelProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  drawState: DrawState;
  drawMode: DrawMode;
  polyPointCount: number;
  error: string | null;
  onAnalyze: () => void;
  onReset: () => void;
}
const QAPercentsPanel: React.FC<QAPercentsPanelProps> = ({
  result, isAnalyzing, drawState, drawMode, polyPointCount, error, onAnalyze, onReset,
}) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const drawHint = drawMode === null
    ? 'Select Rect or Poly to begin drawing'
    : drawMode === 'rect'
      ? (drawState === 'idle'         ? 'Click map to set first corner'
        : drawState === 'first_click' ? 'Click again to set second corner'
        : 'Rectangle selected — click Analyze')
      : (drawState === 'done'         ? `Polygon closed (${polyPointCount} pts) — click Analyze`
        : polyPointCount === 0        ? 'Click to place first vertex'
        : polyPointCount < 3          ? `${polyPointCount} pts — add ${3 - polyPointCount} more`
        : `${polyPointCount} pts — click 1st vertex or dbl-click to close`);

  return (
    <div id="percentsPanel">
      <h3>OSM Surface Scan</h3>

      {/* Draw instructions */}
      <div className="qa-draw-hint-bar">
        <span className="qa-draw-hint-text">{drawHint}</span>
      </div>

      {/* Breakdown table */}
      {result ? (
        <div className="percents-table-wrapper">
          <table>
            <thead><tr><th>Category</th><th>%</th></tr></thead>
            <tbody>
              {Object.entries(result.categoryBreakdown)
                .filter(([, pct]) => pct > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, pct]) => {
                  const meta = CATEGORY_LABELS[cat] ?? { label: cat, color: '#94a3b8' };
                  const isOpen = expandedCat === cat;
                  const subKeys = Object.entries(result.keyBreakdown)
                    .filter(([k, p]) => p > 0 && (KEY_TO_CATEGORY[k] === cat || (cat === 'unknown' && !KEY_TO_CATEGORY[k])))
                    .sort(([, a], [, b]) => b - a);
                  const hasDetail = subKeys.length > 0;
                  return (
                    <React.Fragment key={cat}>
                      <tr
                        className={hasDetail ? 'qa-cat-row qa-cat-row--clickable' : 'qa-cat-row'}
                        onClick={() => hasDetail && setExpandedCat(isOpen ? null : cat)}
                      >
                        <td>
                          <span className="qa-cat-dot" style={{ background: meta.color }} />
                          {meta.label}
                          {hasDetail && (
                            <span className="qa-expand-icon">{isOpen ? '▾' : '▸'}</span>
                          )}
                        </td>
                        <td><strong>{Math.min(pct, 100)}%</strong></td>
                      </tr>
                      {isOpen && subKeys.map(([k, p]) => {
                        const params = OSM_PARAMETER_MAP[k];
                        return (
                          <tr key={k} className="qa-subkey-row">
                            <td colSpan={2}>
                              <div className="qa-subkey-content">
                                <div className="qa-subkey-header">
                                  <span className="qa-subkey-indent" />
                                  <span className="qa-subkey-name">{OSM_KEY_LABELS[k] ?? k}</span>
                                  <span className="qa-subkey-pct">{p}%</span>
                                </div>
                                {params && (
                                  <div className="qa-subkey-params">
                                    <div className="qa-param-row">
                                      <span className="qa-param-label">Heat Load</span>
                                      <div className="qa-param-bar-track">
                                        <div
                                          className="qa-param-bar-fill qa-param-bar--heat"
                                          style={{ width: `${params.heatLoad * 100}%` }}
                                        />
                                      </div>
                                      <span className="qa-param-val">{Math.round(params.heatLoad * 100)}</span>
                                    </div>
                                    <div className="qa-param-row">
                                      <span className="qa-param-label">Cooling</span>
                                      <div className="qa-param-bar-track">
                                        <div
                                          className="qa-param-bar-fill qa-param-bar--cool"
                                          style={{ width: `${params.coolingPotential * 100}%` }}
                                        />
                                      </div>
                                      <span className="qa-param-val">{Math.round(params.coolingPotential * 100)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
          <p className="qa-feature-note">{result.featureCount} OSM features</p>
        </div>
      ) : isAnalyzing ? (
        <div className="qa-empty-table">
          <div className="qa-spinner-sm" /><p>Fetching OSM data…</p>
        </div>
      ) : (
        <div className="percents-table-wrapper">
          <table className="sk-table">
            <thead><tr><th>Category</th><th>%</th></tr></thead>
            <tbody>
              {SK_WIDTHS.map((w, i) => (
                <tr key={i} className="sk-row">
                  <td><div className="sk-line" style={{ height: 10, width: w }} /></td>
                  <td style={{ width: 44 }}><div className="sk-line" style={{ height: 10, width: 32 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <div className="qa-error-bar">{error}</div>}

      {/* Action buttons */}
      <div className="percents-calculate-wrapper">
        <div className="qa-action-row">
          <button className="qa-reset-btn" onClick={onReset} disabled={drawState === 'idle'}>
            Reset
          </button>
          <button
            id="calculateBtn"
            className={drawState === 'done' && !isAnalyzing ? 'active' : 'disabled'}
            onClick={onAnalyze}
            disabled={drawMode === null || drawState !== 'done' || isAnalyzing || (drawMode === 'poly' && polyPointCount < 3)}
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze Area'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ScoresPanel (unchanged) ──────────────────────────────────────────────────
interface ScoresPanelProps { scores: ScoreData; isSummarizeOpen: boolean; onSummarizeToggle: () => void; }
const ScoresPanel: React.FC<ScoresPanelProps> = ({ scores, isSummarizeOpen, onSummarizeToggle }) => {
  const visualAnalysis = {
    strengths: ['Strong water management infrastructure', 'Good distribution of green spaces', 'Effective use of permeable materials'],
    weaknesses: ['Limited canopy coverage in central areas', 'High concentration of sealed surfaces', 'Insufficient shade in pedestrian zones'],
    opportunities: ['Potential for rooftop gardens', 'Space available for additional tree planting', 'Opportunity to retrofit existing buildings'],
  };
  const labels: Record<string, string> = { NEI: 'Nature Integration', SWE: 'Water Management', HEAT: 'Heat Management', TCI: 'Thermal Comfort', BCI: 'Bioclimate', UCIS: 'Total Score' };
  const ucisScore = scores.UCIS;
  const indexScores = (['NEI', 'SWE', 'HEAT', 'TCI', 'BCI'] as const).map(k => ({ key: k, value: scores[k], label: labels[k] }));
  return (
    <div id="scoresPanel">
      <h3>Score Results</h3>
      <div id="ucisSpeedometer">
        <div className="speedometer-container">
          <Speedometer score={ucisScore} />
          <div className="speedometer-center">
            <div className="center-value">{ucisScore.toFixed(0)}</div>
            <div className="center-label">UCIS</div>
          </div>
        </div>
      </div>
      <div id="indexScores">
        {indexScores.map(item => (
          <div key={item.key} className="index-score-row-compact">
            <span className="index-key-compact">{item.key}</span>
            <div className="index-bar-container-compact">
              <div className="index-bar-compact" style={{ width: `${item.value}%` }} />
            </div>
            <span className="index-value-compact">{item.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div id="summarizeWrapper">
        <button id="summarizeToggleBtn" onClick={onSummarizeToggle} className={isSummarizeOpen ? 'open' : ''}>
          <span>Summarize</span>
          <span className="toggle-icon">{isSummarizeOpen ? '−' : '+'}</span>
        </button>
        {isSummarizeOpen && (
          <div id="summarizeSection">
            <div className="summarize-content">{generateSummary(ucisScore, indexScores)}</div>
          </div>
        )}
      </div>
      <div className="strategies-section" style={{ marginTop: '24px' }}>
        <h4 className="section-title">Visual Analysis</h4>
        <div className="analysis-grid">
          {(['strengths', 'weaknesses', 'opportunities'] as const).map(type => (
            <div key={type} className={`analysis-card ${type}`}>
              <div className="analysis-header"><h5>{type.charAt(0).toUpperCase() + type.slice(1)}</h5></div>
              <ul className="analysis-list">{visualAnalysis[type].map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const generateSummary = (ucisScore: number, indexScores: { key: string; value: number; label: string }[]) => {
  const lvl = ucisScore >= 80 ? { level: 'excellent', color: '#22c55e' } : ucisScore >= 60 ? { level: 'good', color: '#84cc16' } : ucisScore >= 40 ? { level: 'moderate', color: '#fbbf24' } : { level: 'needs_improvement', color: '#ef4444' };
  const strongest = indexScores.reduce((m, i) => i.value > m.value ? i : m, indexScores[0]);
  const weakest = indexScores.reduce((m, i) => i.value < m.value ? i : m, indexScores[0]);
  const avgIndex = indexScores.reduce((s, i) => s + i.value, 0) / indexScores.length;
  return (
    <div className="summarize-text">
      <div className="summary-header"><span className="summary-score" style={{ color: lvl.color }}>{ucisScore.toFixed(0)} UCIS</span></div>
      <p className="summary-sentence">Your UCIS of {ucisScore.toFixed(0)} indicates a {lvl.level.replace('_', ' ')} level.</p>
      <p className="summary-sentence">Strongest: {strongest.label} ({strongest.value.toFixed(0)}). Weakest: {weakest.label} ({weakest.value.toFixed(0)}).</p>
      <p className="summary-sentence">Average index: {avgIndex.toFixed(0)}.</p>
    </div>
  );
};

// ─── QA Scores Panel (replaces ScoresPanel in QA mode) ───────────────────────
interface QAScoresPanelProps { result: AnalysisResult; }
const QAScoresPanel: React.FC<QAScoresPanelProps> = ({ result }) => {
  const risk = getRiskLevel(result.uhiScore);
  return (
    <div id="scoresPanel">
      <h3>UHI Risk Score</h3>

      {/* Barometer */}
      <div id="ucisSpeedometer">
        <div className="speedometer-container">
          <UHIBarometer score={result.uhiScore} />
          <div className="speedometer-center">
            <div className="center-value" style={{ color: risk.color }}>{result.uhiScore}</div>
            <div className="center-label" style={{ color: risk.color }}>{risk.label}</div>
          </div>
        </div>
      </div>

      <p className="qa-risk-description">{risk.description}</p>

      {/* Sub-scores */}
      <div id="indexScores">
        {Object.entries(result.subScores).map(([key, val]) => {
          const meta = SUB_SCORE_META[key];
          const good = meta?.higherIsBetter ?? false;
          const barColor = good ? `hsl(${val * 1.2}, 65%, 45%)` : `hsl(${(100 - val) * 1.2}, 65%, 45%)`;
          return (
            <div key={key} className="index-score-row-compact">
              <span className="index-key-compact" style={{ fontSize: '10px' }}>{meta?.label ?? key}</span>
              <div className="index-bar-container-compact">
                <div className="index-bar-compact" style={{ width: `${val}%`, background: barColor }} />
              </div>
              <span className="index-value-compact">{val}</span>
            </div>
          );
        })}
      </div>

      {/* SWOT */}
      <div className="strategies-section" style={{ marginTop: '20px' }}>
        <h4 className="section-title">SWOT Analysis</h4>
        <div className="analysis-grid qa-swot-grid-4">
          <QASwotCard title="Strengths"     type="strengths"     items={result.swot.strengths} />
          <QASwotCard title="Weaknesses"    type="weaknesses"    items={result.swot.weaknesses} />
          <QASwotCard title="Opportunities" type="opportunities" items={result.swot.opportunities} />
          <QASwotCard title="Threats"       type="threats"       items={result.swot.threats} />
        </div>
      </div>

      {/* Premium CTA */}
      <div className="qa-premium-cta-inline">
        <p>Upgrade to Premium for physics-based simulation, scenario generation and exportable reports.</p>
      </div>
    </div>
  );
};

interface QASwotCardProps { title: string; type: string; items: string[]; }
const QASwotCard: React.FC<QASwotCardProps> = ({ title, type, items }) => (
  <div className={`analysis-card ${type}`}>
    <div className="analysis-header"><h5>{title}</h5></div>
    <ul className="analysis-list">
      {items.length > 0 ? items.map((item, i) => <li key={i}>{item}</li>) : <li style={{ opacity: 0.5 }}>None identified</li>}
    </ul>
  </div>
);

// ─── MainArea ─────────────────────────────────────────────────────────────────
interface MainAreaProps {
  gridSize: number;
  gridClasses: GridArray;
  isPainting: boolean;
  setIsPainting: (p: boolean) => void;
  baseImageSrc: string | null;
  gridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageRef: React.RefObject<HTMLImageElement | null>;
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  paintAt: (x: number, y: number) => void;
  updateStatsAndScores: () => { percents: { [key in GridClass]: number }; scores: ScoreData };
  drawGridAndCells: () => void;
  locationInfo?: string;
  mapCenter?: [number, number];
  onLocationSelect?: (loc: { name: string; lat: number; lon: number }) => void;
}

const MainArea: React.FC<MainAreaProps> = ({
  gridSize, gridClasses, isPainting, setIsPainting, baseImageSrc,
  gridCanvasRef, baseImageRef, fallbackCanvasRef, paintAt,
  updateStatsAndScores, drawGridAndCells, locationInfo,
  mapCenter = [41.015, 28.979], onLocationSelect,
}) => {
  // ── Canvas mode state ──
  const [statsAndScores, setStatsAndScores] = useState(() => updateStatsAndScores());
  const [isCalculated, setIsCalculated] = useState(false);
  const [isSummarizeOpen, setIsSummarizeOpen] = useState(false);

  useEffect(() => {
    setStatsAndScores(updateStatsAndScores());
    setIsCalculated(false);
  }, [gridClasses, gridSize, updateStatsAndScores]);

  const isAllPixelsFilled = () => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!gridClasses[r][c] || gridClasses[r][c] === 'bos') return false;
    return true;
  };

  // ── QA mode state ──
  const [isQAMode, setIsQAMode]           = useState(false);
  const [drawMode, setDrawMode]           = useState<DrawMode>(null);
  const [drawState, setDrawState]         = useState<DrawState>('idle');
  const [corner1, setCorner1]             = useState<[number, number] | null>(null);
  const [corner2, setCorner2]             = useState<[number, number] | null>(null);
  const [previewCorner, setPreviewCorner] = useState<[number, number] | null>(null);
  const [polyPoints, setPolyPoints]       = useState<[number, number][]>([]);
  const [previewPoint, setPreviewPoint]   = useState<[number, number] | null>(null);
  const [qaResult, setQaResult]           = useState<AnalysisResult | null>(null);
  const [qaAnalyzing, setQaAnalyzing]     = useState(false);
  const [qaError, setQaError]             = useState<string | null>(null);
  const [mapKey, setMapKey]               = useState(0);

  const resetDraw = () => {
    setDrawState('idle');
    setCorner1(null); setCorner2(null); setPreviewCorner(null);
    setPolyPoints([]); setPreviewPoint(null);
    setQaResult(null); setQaError(null);
  };

  const handleToggleQA = () => { setIsQAMode(v => !v); resetDraw(); };
  const handleSetDrawMode = (m: DrawMode) => { setDrawMode(m); resetDraw(); };

  useEffect(() => { setMapKey(k => k + 1); }, [mapCenter]);

  // Rectangle handlers
  const handleFirstClick  = (lat: number, lon: number) => {
    setCorner1([lat, lon]); setCorner2(null); setPreviewCorner(null);
    setQaResult(null); setQaError(null); setDrawState('first_click');
  };
  const handleSecondClick = (lat: number, lon: number) => {
    setCorner2([lat, lon]); setPreviewCorner(null); setDrawState('done');
  };
  const handleMouseMove   = (lat: number, lon: number) => setPreviewCorner([lat, lon]);

  // Polygon handlers
  const handlePolyPoint = (lat: number, lon: number) => {
    setPolyPoints(prev => {
      const next: [number, number][] = [...prev, [lat, lon]];
      if (prev.length === 0) setDrawState('first_click');
      return next;
    });
    setQaResult(null); setQaError(null);
  };
  const handlePolyClose   = () => { setPreviewPoint(null); setDrawState('done'); };
  const handlePolyPreview = (lat: number, lon: number) => setPreviewPoint([lat, lon]);

  const handleReset = resetDraw;

  const handleLocationFound = (name: string, lat: number, lon: number) => {
    onLocationSelect?.({ name, lat, lon });
  };

  const handleAnalyze = async () => {
    setQaAnalyzing(true); setQaError(null); setQaResult(null);
    try {
      let analysisArea: BBox | PolyArea;
      if (drawMode === 'rect') {
        if (!corner1 || !corner2) return;
        const bbox: BBox = {
          south: Math.min(corner1[0], corner2[0]),
          north: Math.max(corner1[0], corner2[0]),
          west:  Math.min(corner1[1], corner2[1]),
          east:  Math.max(corner1[1], corner2[1]),
        };
        const sz = (bbox.north - bbox.south) * (bbox.east - bbox.west);
        if (sz > 0.01) { setQaError('Area too large — draw a smaller rectangle.'); setQaAnalyzing(false); return; }
        if (sz < 1e-6) { setQaError('Area too small — draw a larger rectangle.');  setQaAnalyzing(false); return; }
        analysisArea = bbox;
      } else {
        if (polyPoints.length < 3) return;
        analysisArea = { points: polyPoints.map(([lat, lon]) => ({ lat, lon })) };
      }
      const res = await analyzeArea(analysisArea);
      setQaResult(res);
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('timeout');
      setQaError(isAbort
        ? 'Request timed out. Try again or draw a smaller area.'
        : 'Could not reach OpenStreetMap data service. Check your internet connection and try again.');
    } finally {
      setQaAnalyzing(false);
    }
  };

  const allFilled = isAllPixelsFilled();

  return (
    <main id="mainArea">
      <div id="canvasAndPercents">
        <CanvasArea
          gridCanvasRef={gridCanvasRef}
          baseImageRef={baseImageRef}
          fallbackCanvasRef={fallbackCanvasRef}
          baseImageSrc={baseImageSrc}
          isPainting={isPainting}
          setIsPainting={setIsPainting}
          paintAt={paintAt}
          drawGridAndCells={drawGridAndCells}
          gridSize={gridSize}
          locationInfo={locationInfo}
          isQAMode={isQAMode}
          onToggleQA={handleToggleQA}
          mapCenter={mapCenter}
          drawState={drawState}
          drawMode={drawMode}
          onSetDrawMode={handleSetDrawMode}
          corner1={corner1}
          corner2={corner2}
          previewCorner={previewCorner}
          onFirstClick={handleFirstClick}
          onSecondClick={handleSecondClick}
          onMouseMove={handleMouseMove}
          polyPoints={polyPoints}
          previewPoint={previewPoint}
          onPolyPoint={handlePolyPoint}
          onPolyClose={handlePolyClose}
          onPolyPreview={handlePolyPreview}
          mapKey={mapKey}
          qaResult={qaResult}
          onLocationFound={handleLocationFound}
          onAnalyze={handleAnalyze}
          onReset={handleReset}
          isAnalyzing={qaAnalyzing}
        />

        {isQAMode ? (
          <QAPercentsPanel
            result={qaResult}
            isAnalyzing={qaAnalyzing}
            drawState={drawState}
            drawMode={drawMode}
            polyPointCount={polyPoints.length}
            error={qaError}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
          />
        ) : (
          <PercentsPanel
            percents={statsAndScores.percents}
            calculateButton={
              <div className="calculate-btn-wrapper">
                <button
                  id="calculateBtn"
                  className={allFilled ? 'active' : 'disabled'}
                  onClick={() => { setStatsAndScores(updateStatsAndScores()); setIsCalculated(true); }}
                  disabled={!allFilled}
                >
                  {isCalculated ? 'Calculated' : 'Calculate'}
                </button>
                {!allFilled && <div className="calculate-tooltip">All pixels must be filled</div>}
              </div>
            }
          />
        )}
      </div>

      {isQAMode && qaResult ? (
        <QAScoresPanel result={qaResult} />
      ) : !isQAMode ? (
        <ScoresPanel
          scores={statsAndScores.scores}
          isSummarizeOpen={isSummarizeOpen}
          onSummarizeToggle={() => setIsSummarizeOpen(v => !v)}
        />
      ) : (
        <QASkeletonScores />
      )}

      {!isQAMode && (
        <>
          <SaaSProducts scores={statsAndScores.scores} />
          <CoolStrategies scores={statsAndScores.scores} />
        </>
      )}
    </main>
  );
};

export default MainArea;
