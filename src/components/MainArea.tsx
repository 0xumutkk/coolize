import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CLASS_CONFIG } from '../utils/constants';
import Speedometer from './Speedometer';
import CanvasNavbar from './CanvasNavbar';

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
  }, [baseImageSrc, fallbackCanvasRef, gridCanvasRef, drawGridAndCells, gridSize, baseImageRef]);

  useEffect(() => {
    const handleResize = () => {
      syncCanvasSize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseImageSrc, fallbackCanvasRef, gridCanvasRef, drawGridAndCells, gridSize, baseImageRef]);


  return (
    <div id="canvasWrapper" ref={fullscreenContainerRef}>
      <CanvasNavbar />
      <div id="canvasContainer" ref={containerRef}>
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
          ref={fallbackCanvasRef}
          style={{ display: baseImageSrc ? 'none' : 'block' }}
        ></canvas>
        <button
          id="fullscreenBtn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran yap"}
          className={isFullscreen ? "fullscreen-active" : ""}
        >
          {isFullscreen ? "⤓" : "⤢"}
        </button>
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
      <h3>📊 Alan Dağılımı</h3>
      <div className="percents-table-wrapper">
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
}

const ScoresPanel: React.FC<ScoresPanelProps> = ({ scores }) => {


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
      <h3>⭐ Score Results</h3>
      
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
      <div id="summarizeSection">
        <h4>📋 Summarize</h4>
        <div className="summarize-content">
          {generateSummary(ucisScore, indexScores)}
        </div>
      </div>
    </div>
  );
};

const generateSummary = (ucisScore: number, indexScores: Array<{ key: string; value: number; label: string }>) => {
  const getScoreLevel = (score: number) => {
    if (score >= 80) return { level: 'excellent', emoji: '🌟', color: '#22c55e' };
    if (score >= 60) return { level: 'good', emoji: '✅', color: '#84cc16' };
    if (score >= 40) return { level: 'moderate', emoji: '⚠️', color: '#fbbf24' };
    return { level: 'needs_improvement', emoji: '🔴', color: '#ef4444' };
  };

  const ucisLevel = getScoreLevel(ucisScore);
  const avgIndex = indexScores.reduce((sum, item) => sum + item.value, 0) / indexScores.length;
  
  const strongestIndex = indexScores.reduce((max, item) => item.value > max.value ? item : max, indexScores[0]);
  const weakestIndex = indexScores.reduce((min, item) => item.value < min.value ? item : min, indexScores[0]);

  const sentences = [
    `UrbanCool.ai City Index Score (UCIS) değeriniz ${ucisScore.toFixed(0)} puan ile ${ucisLevel.level === 'excellent' ? 'mükemmel' : ucisLevel.level === 'good' ? 'iyi' : ucisLevel.level === 'moderate' ? 'orta' : 'iyileştirme gerektiren'} bir seviyede.`,
    `En güçlü alanınız ${strongestIndex.label} (${strongestIndex.value.toFixed(0)} puan), en zayıf alanınız ise ${weakestIndex.label} (${weakestIndex.value.toFixed(0)} puan) olarak öne çıkıyor.`,
    `Ortalama indeks skorunuz ${avgIndex.toFixed(0)} puan. Bu sonuçlar, projenizin ${ucisLevel.level === 'excellent' ? 'sürdürülebilir şehir gelişimi açısından örnek teşkil ettiğini' : ucisLevel.level === 'good' ? 'iyi bir sürdürülebilirlik seviyesinde olduğunu' : ucisLevel.level === 'moderate' ? 'orta seviyede bir sürdürülebilirlik gösterdiğini' : 'sürdürülebilirlik açısından iyileştirme potansiyeli olduğunu'} gösteriyor.`,
    `${strongestIndex.label} alanındaki güçlü performansınızı koruyarak, ${weakestIndex.label} alanında yapılacak iyileştirmelerle UCIS skorunuzu daha da artırabilirsiniz.`
  ];

  return (
    <div className="summarize-text">
      <div className="summary-header">
        <span className="summary-emoji" style={{ color: ucisLevel.color }}>{ucisLevel.emoji}</span>
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
        />
        <PercentsPanel 
          percents={statsAndScores.percents}
          calculateButton={
            <button
              id="calculateBtn"
              className={allFilled ? "active" : "disabled"}
              onClick={handleCalculate}
              disabled={!allFilled}
            >
              {isCalculated ? "✓ Calculated" : "Calculate"}
            </button>
          }
        />
      </div>
      <ScoresPanel scores={statsAndScores.scores} />
    </main>
  );
};

export default MainArea;
