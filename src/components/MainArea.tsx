import React, { useRef, useEffect, useState } from 'react';
import { CLASS_CONFIG } from '../utils/constants';

type GridClass = keyof typeof CLASS_CONFIG;
type GridArray = GridClass[][];

interface CanvasAreaProps {
  gridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageRef: React.RefObject<HTMLImageElement | null>;
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageSrc: string | null;
  isPainting: boolean;
  setIsPainting: (painting: boolean) => void;
  paintAt: (x: number, y: number) => void;
  drawGridAndCells: () => void;
  gridSize: number;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  gridCanvasRef,
  baseImageRef,
  fallbackCanvasRef,
  baseImageSrc,
  isPainting,
  setIsPainting,
  paintAt,
  drawGridAndCells,
  gridSize,
}) => {
  const pointerPos = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = gridCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    const p = pointerPos(e);
    paintAt(p.x, p.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;
    const p = pointerPos(e);
    paintAt(p.x, p.y);
  };

  const handleMouseUp = () => {
    setIsPainting(false);
  };

  useEffect(() => {
    // Initial setup for fallback canvas if no image is loaded
    if (!baseImageSrc && fallbackCanvasRef.current && gridCanvasRef.current) {
      const rect = fallbackCanvasRef.current.getBoundingClientRect();
      gridCanvasRef.current.width = rect.width;
      gridCanvasRef.current.height = rect.height;
      gridCanvasRef.current.style.width = rect.width + 'px';
      gridCanvasRef.current.style.height = rect.height + 'px';
      if (baseImageRef.current) {
        baseImageRef.current.style.display = 'none';
      }
      fallbackCanvasRef.current.style.display = 'block';
      drawGridAndCells();
    }
  }, [baseImageSrc, fallbackCanvasRef, gridCanvasRef, drawGridAndCells, gridSize, baseImageRef]);


  return (
    <div id="canvasWrapper">
      <div id="canvasContainer">
        <img
          id="baseImage"
          alt="Görsel henüz yüklenmedi"
          ref={baseImageRef}
          src={baseImageSrc || undefined}
          style={{ display: baseImageSrc ? 'block' : 'none' }}
        />
        <canvas
          id="gridCanvas"
          ref={gridCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Mouse kanvastan çıktığında çizimi durdur
        ></canvas>
        <canvas
          id="fallbackCanvas"
          width="1000"
          height="800"
          ref={fallbackCanvasRef}
          style={{ display: baseImageSrc ? 'none' : 'block', width: '100%', maxWidth: '1200px', height: 'auto' }}
        ></canvas>
      </div>
    </div>
  );
};

interface ScoreData {
  NEI: number;
  SWE: number;
  HEAT: number;
  TCI: number;
  BCI: number;
  UCIS: number;
}

interface InfoPanelProps {
  percents: { [key in GridClass]: number };
  scores: ScoreData;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ percents, scores }) => {
  const percentRows = Object.entries(percents).map(([key, value]) => {
    const label = CLASS_CONFIG[key as GridClass]?.label || key;
    return { label, value: value || 0 };
  }).sort((a, b) => b.value - a.value); // Yüzdesi en yüksekten en düşüğe sırala

  const scoreBarRefs: { [key: string]: React.RefObject<HTMLDivElement | null> } = { // Allow null for refs
    NEI: useRef<HTMLDivElement>(null),
    SWE: useRef<HTMLDivElement>(null),
    HEAT: useRef<HTMLDivElement>(null),
    TCI: useRef<HTMLDivElement>(null),
    BCI: useRef<HTMLDivElement>(null),
    UCIS: useRef<HTMLDivElement>(null),
  };
  const scoreValueRefs: { [key: string]: React.RefObject<HTMLDivElement | null> } = { // Allow null for refs
    NEI: useRef<HTMLDivElement>(null),
    SWE: useRef<HTMLDivElement>(null),
    HEAT: useRef<HTMLDivElement>(null),
    TCI: useRef<HTMLDivElement>(null),
    BCI: useRef<HTMLDivElement>(null),
    UCIS: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    Object.entries(scores).forEach(([key, value]) => {
      const bar = scoreBarRefs[key as keyof ScoreData].current;
      const valSpan = scoreValueRefs[key as keyof ScoreData].current;
      if (bar) bar.style.width = value.toFixed(0) + '%';
      if (valSpan) valSpan.textContent = value.toFixed(0);
    });
  }, [percents, scores, scoreBarRefs, scoreValueRefs]); // Depend on percents and scores directly


  const getScoreLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      NEI: 'Doğa Entegrasyonu',
      SWE: 'Su Yönetimi',
      HEAT: 'Isı Yönetimi',
      TCI: 'Termal Konfor',
      BCI: 'Biyoiklim',
      UCIS: 'Toplam Skor'
    };
    return labels[key] || key;
  };

  return (
    <section id="infoPanel">
      <div id="percents">
        <h3>📊 Alan Dağılımı</h3>
        <table>
          <thead>
            <tr>
              <th>Yüzey Türü</th>
              <th>Yüzde</th>
            </tr>
          </thead>
          <tbody id="percentTableBody">
            {percentRows.map((row, index) => (
              <tr key={index}>
                <td>{row.label}</td>
                <td><strong>{row.value.toFixed(1)}%</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div id="scoresPanel">
        <h3>⭐ UCIS Skorları</h3>
        {(Object.keys(scoreBarRefs) as Array<keyof typeof scoreBarRefs>).map((key) => (
          <div key={key} className={`score-row ${key === 'UCIS' ? 'total' : ''}`}>
            <div className="score-label" title={getScoreLabel(String(key))}>
              {key === 'UCIS' ? '🎯' : ''} {key}
            </div>
            <div className="score-bar-wrap">
              <div
                className="score-bar"
                ref={scoreBarRefs[key as keyof ScoreData]}
              ></div>
            </div>
            <div
              className="score-value"
              ref={scoreValueRefs[key as keyof ScoreData]}
            >
              {scores[key as keyof ScoreData].toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};


interface MainAreaProps {
  gridSize: number;
  gridClasses: GridArray;
  isPainting: boolean;
  setIsPainting: (painting: boolean) => void;
  baseImageSrc: string | null;
  gridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  baseImageRef: React.RefObject<HTMLImageElement | null>;
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  paintAt: (x: number, y: number) => void;
  updateStatsAndScores: () => { percents: { [key in GridClass]: number; }; scores: ScoreData; };
  drawGridAndCells: () => void; // useGrid'den geliyor
}

const MainArea: React.FC<MainAreaProps> = ({
  gridSize,
  gridClasses,
  isPainting,
  setIsPainting,
  baseImageSrc,
  gridCanvasRef,
  baseImageRef,
  fallbackCanvasRef,
  paintAt,
  updateStatsAndScores,
  drawGridAndCells,
}) => {
  const [statsAndScores, setStatsAndScores] = useState<{ percents: { [key in GridClass]: number }; scores: ScoreData }>(() => updateStatsAndScores());

  useEffect(() => {
    setStatsAndScores(updateStatsAndScores());
  }, [gridClasses, gridSize, updateStatsAndScores]);


  return (
    <main id="mainArea">
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
      />
      <InfoPanel
        percents={statsAndScores.percents}
        scores={statsAndScores.scores}
      />
    </main>
  );
};

export default MainArea;
