import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CLASS_CONFIG } from '../utils/constants';
import Speedometer from './Speedometer';
import CanvasNavbar from './CanvasNavbar';
import CoolStrategies from './CoolStrategies';

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
  locationInfo?: string;
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
  locationInfo,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerPos = (evt: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = gridCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return { x, y };
  };

  const syncCanvasSize = useCallback(() => {
    if (containerRef.current && gridCanvasRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = Math.round(containerRect.width);
      const containerHeight = Math.round(containerRect.height);
      
      // Set grid canvas size to match container
      if (gridCanvasRef.current.width !== containerWidth || gridCanvasRef.current.height !== containerHeight) {
        gridCanvasRef.current.width = containerWidth;
        gridCanvasRef.current.height = containerHeight;
        gridCanvasRef.current.style.width = containerWidth + 'px';
        gridCanvasRef.current.style.height = containerHeight + 'px';
      }
      
      // If no image, setup fallback canvas
      if (!baseImageSrc && fallbackCanvasRef.current) {
        if (fallbackCanvasRef.current.width !== containerWidth || fallbackCanvasRef.current.height !== containerHeight) {
          fallbackCanvasRef.current.width = containerWidth;
          fallbackCanvasRef.current.height = containerHeight;
          fallbackCanvasRef.current.style.width = containerWidth + 'px';
          fallbackCanvasRef.current.style.height = containerHeight + 'px';
        }
        if (baseImageRef.current) {
          baseImageRef.current.style.display = 'none';
        }
        fallbackCanvasRef.current.style.display = 'block';
      }
      
      drawGridAndCells();
    }
  }, [baseImageSrc, baseImageRef, fallbackCanvasRef, gridCanvasRef, drawGridAndCells]);

  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (fullscreenContainerRef.current.requestFullscreen) {
          await fullscreenContainerRef.current.requestFullscreen();
        } else if ((fullscreenContainerRef.current as any).webkitRequestFullscreen) {
          await (fullscreenContainerRef.current as any).webkitRequestFullscreen();
        } else if ((fullscreenContainerRef.current as any).mozRequestFullScreen) {
          await (fullscreenContainerRef.current as any).mozRequestFullScreen();
        } else if ((fullscreenContainerRef.current as any).msRequestFullscreen) {
          await (fullscreenContainerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      if (isCurrentlyFullscreen) {
        setTimeout(() => syncCanvasSize(), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [syncCanvasSize]);

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
    syncCanvasSize();
  }, [baseImageSrc, fallbackCanvasRef, gridCanvasRef, drawGridAndCells, gridSize, baseImageRef, syncCanvasSize]);

  useEffect(() => {
    const handleResize = () => {
      syncCanvasSize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncCanvasSize]);


  const [rulerSize, setRulerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateRulerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setRulerSize({ width: rect.width, height: rect.height });
      }
    };
    // Initial update
    const timer = setTimeout(updateRulerSize, 100);
    const handleResize = () => {
      setTimeout(updateRulerSize, 50);
    };
    window.addEventListener('resize', handleResize);
    // Also update when canvas size changes
    const interval = setInterval(updateRulerSize, 200);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [baseImageSrc, gridSize]);

  const renderRuler = (orientation: 'horizontal' | 'vertical') => {
    if (rulerSize.width === 0 || rulerSize.height === 0) return null;
    
    const isHorizontal = orientation === 'horizontal';
    const length = isHorizontal ? rulerSize.width : rulerSize.height;
    const rulerSize_px = 24;
    
    // Calculate tick interval based on grid size
    const cellsPerTick = Math.max(1, Math.floor(gridSize / 20));
    const cellSize = length / gridSize;
    const tickInterval = cellSize * cellsPerTick;
    
    const ticks = [];
    const majorTickInterval = tickInterval * 5;
    
    for (let i = 0; i <= length; i += tickInterval) {
      const isMajorTick = Math.abs(i % majorTickInterval) < tickInterval / 2 || i === 0 || i >= length - tickInterval / 2;
      const cellIndex = Math.round((i / length) * gridSize);
      ticks.push({
        position: i,
        isMajor: isMajorTick,
        label: isMajorTick ? cellIndex : null
      });
    }

    return (
      <div 
        className={`ruler ${orientation}`}
        style={{
          width: isHorizontal ? length : rulerSize_px,
          height: isHorizontal ? rulerSize_px : length
        }}
      >
        {ticks.map((tick, idx) => (
          <div
            key={idx}
            className={`ruler-tick ${tick.isMajor ? 'major' : 'minor'}`}
            style={
              isHorizontal
                ? { left: `${tick.position}px` }
                : { top: `${tick.position}px` }
            }
          >
            {tick.label !== null && (
              <span className="ruler-label">{tick.label}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div id="canvasWrapper" ref={fullscreenContainerRef}>
      <CanvasNavbar locationInfo={locationInfo} />
      <div id="canvasWithRulers">
        {renderRuler('horizontal')}
        <div id="canvasRulerContainer">
          {renderRuler('vertical')}
          <div id="canvasContainer" ref={containerRef}>
            <img
              id="baseImage"
              alt="Base map not loaded yet"
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
              onMouseLeave={handleMouseUp}
            ></canvas>
            <canvas
              id="fallbackCanvas"
              ref={fallbackCanvasRef}
              style={{ display: baseImageSrc ? 'none' : 'block' }}
            ></canvas>
            <button
              id="fullscreenBtn"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className={isFullscreen ? "fullscreen-active" : ""}
            >
              {isFullscreen ? "⤓" : "⤢"}
            </button>
          </div>
        </div>
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

interface PercentsPanelProps {
  percents: { [key in GridClass]: number };
  calculateButton?: React.ReactNode;
}

const PercentsPanel: React.FC<PercentsPanelProps> = ({ percents, calculateButton }) => {
  const percentRows = Object.entries(percents).map(([key, value]) => {
    const label = CLASS_CONFIG[key as GridClass]?.label || key;
    return { label, value: value || 0 };
  }).sort((a, b) => b.value - a.value);

  return (
    <div id="percentsPanel">
      <h3>Area Distribution</h3>
      <div className="percents-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Surface Type</th>
              <th>Percentage</th>
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
      {calculateButton && (
        <div className="percents-calculate-wrapper">
          {calculateButton}
        </div>
      )}
    </div>
  );
};

interface ScoresPanelProps {
  scores: ScoreData;
  isSummarizeOpen: boolean;
  onSummarizeToggle: () => void;
}

const ScoresPanel: React.FC<ScoresPanelProps> = ({ scores, isSummarizeOpen, onSummarizeToggle }) => {


  const getScoreLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      NEI: 'Nature Integration',
      SWE: 'Water Management',
      HEAT: 'Heat Management',
      TCI: 'Thermal Comfort',
      BCI: 'Bioclimate',
      UCIS: 'Total Score'
    };
    return labels[key] || key;
  };

  const ucisScore = scores.UCIS;
  const indexScores = [
    { key: 'NEI', value: scores.NEI, label: getScoreLabel('NEI') },
    { key: 'SWE', value: scores.SWE, label: getScoreLabel('SWE') },
    { key: 'HEAT', value: scores.HEAT, label: getScoreLabel('HEAT') },
    { key: 'TCI', value: scores.TCI, label: getScoreLabel('TCI') },
    { key: 'BCI', value: scores.BCI, label: getScoreLabel('BCI') },
  ];

  return (
    <div id="scoresPanel">
      <h3>Score Results</h3>
      
      {/* UCIS Speedometer */}
      <div id="ucisSpeedometer">
        <div className="speedometer-container">
          <Speedometer score={ucisScore} />
          <div className="speedometer-center">
            <div className="center-value">{ucisScore.toFixed(0)}</div>
            <div className="center-label">UCIS</div>
          </div>
        </div>
      </div>

      {/* Index Scores - Compact */}
      <div id="indexScores">
        {indexScores.map((item) => (
          <div key={item.key} className="index-score-row-compact">
            <span className="index-key-compact">{item.key}</span>
            <div className="index-bar-container-compact">
              <div 
                className="index-bar-compact"
                style={{ width: `${item.value}%` }}
              ></div>
            </div>
            <span className="index-value-compact">{item.value.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Summarize Section */}
      <div id="summarizeWrapper">
        <button 
          id="summarizeToggleBtn"
          onClick={onSummarizeToggle}
          className={isSummarizeOpen ? 'open' : ''}
        >
          <span>Summarize</span>
          <span className="toggle-icon">{isSummarizeOpen ? '−' : '+'}</span>
        </button>
        {isSummarizeOpen && (
          <div id="summarizeSection">
            <div className="summarize-content">
              {generateSummary(ucisScore, indexScores)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const generateSummary = (ucisScore: number, indexScores: Array<{ key: string; value: number; label: string }>) => {
  const getScoreLevel = (score: number) => {
    if (score >= 80) return { level: 'excellent', emoji: '', color: '#22c55e' };
    if (score >= 60) return { level: 'good', emoji: '', color: '#84cc16' };
    if (score >= 40) return { level: 'moderate', emoji: '', color: '#fbbf24' };
    return { level: 'needs_improvement', emoji: '', color: '#ef4444' };
  };

  const ucisLevel = getScoreLevel(ucisScore);
  const avgIndex = indexScores.reduce((sum, item) => sum + item.value, 0) / indexScores.length;
  
  const strongestIndex = indexScores.reduce((max, item) => item.value > max.value ? item : max, indexScores[0]);
  const weakestIndex = indexScores.reduce((min, item) => item.value < min.value ? item : min, indexScores[0]);

  const sentences = [
    `Your UrbanCool.ai City Index Score (UCIS) value of ${ucisScore.toFixed(0)} points indicates a ${ucisLevel.level === 'excellent' ? 'excellent' : ucisLevel.level === 'good' ? 'good' : ucisLevel.level === 'moderate' ? 'moderate' : 'needs improvement'} level.`,
    `Your strongest area is ${strongestIndex.label} (${strongestIndex.value.toFixed(0)} points), while your weakest area is ${weakestIndex.label} (${weakestIndex.value.toFixed(0)} points).`,
    `Your average index score is ${avgIndex.toFixed(0)} points. These results show that your project ${ucisLevel.level === 'excellent' ? 'exemplifies sustainable urban development' : ucisLevel.level === 'good' ? 'is at a good sustainability level' : ucisLevel.level === 'moderate' ? 'shows moderate sustainability' : 'has potential for improvement in terms of sustainability'}.`,
    `By maintaining your strong performance in ${strongestIndex.label}, you can further increase your UCIS score with improvements in the ${weakestIndex.label} area.`
  ];

  return (
    <div className="summarize-text">
      <div className="summary-header">
        <span className="summary-score" style={{ color: ucisLevel.color }}>{ucisScore.toFixed(0)} UCIS</span>
      </div>
      {sentences.map((sentence, index) => (
        <p key={index} className="summary-sentence">{sentence}</p>
      ))}
    </div>
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
  locationInfo?: string;
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
  locationInfo,
}) => {
  const [statsAndScores, setStatsAndScores] = useState<{ percents: { [key in GridClass]: number }; scores: ScoreData }>(() => updateStatsAndScores());
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    setStatsAndScores(updateStatsAndScores());
    setIsCalculated(false); // Reset calculation status when grid changes
  }, [gridClasses, gridSize, updateStatsAndScores]);

  // Check if all pixels are filled
  const isAllPixelsFilled = () => {
    const totalCells = gridSize * gridSize;
    let filledCells = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cls = gridClasses[r][c];
        if (cls && cls !== "bos") {
          filledCells++;
        }
      }
    }
    return filledCells === totalCells;
  };

  const handleCalculate = () => {
    const newStats = updateStatsAndScores();
    setStatsAndScores(newStats);
    setIsCalculated(true);
  };

  const allFilled = isAllPixelsFilled();
  const [isSummarizeOpen, setIsSummarizeOpen] = useState(false);

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
        />
        <PercentsPanel 
          percents={statsAndScores.percents}
          calculateButton={
            <div className="calculate-btn-wrapper">
              <button
                id="calculateBtn"
                className={allFilled ? "active" : "disabled"}
                onClick={handleCalculate}
                disabled={!allFilled}
              >
                {isCalculated ? "Calculated" : "Calculate"}
              </button>
              {!allFilled && (
                <div className="calculate-tooltip">All pixels must be filled</div>
              )}
            </div>
          }
        />
      </div>
      <ScoresPanel 
        scores={statsAndScores.scores}
        isSummarizeOpen={isSummarizeOpen}
        onSummarizeToggle={() => setIsSummarizeOpen(!isSummarizeOpen)}
      />
      <CoolStrategies scores={statsAndScores.scores} />
    </main>
  );
};

export default MainArea;
