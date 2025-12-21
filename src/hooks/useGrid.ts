import { useState, useRef, useEffect, useCallback } from 'react';
import { CLASS_CONFIG } from '../utils/constants';

type GridClass = keyof typeof CLASS_CONFIG;
type GridArray = GridClass[][];

interface CanvasSize {
  width: number;
  height: number;
}

const initGridArray = (size: number): GridArray => {
  const newGrid: GridArray = [];
  for (let r = 0; r < size; r++) {
    const row: GridClass[] = [];
    for (let c = 0; c < size; c++) {
      row.push("bos");
    }
    newGrid.push(row);
  }
  return newGrid;
};

const clamp = (v: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, v));
};

export const useGrid = () => {
  const [gridSize, setGridSize] = useState<number>(100);
  const [gridClasses, setGridClasses] = useState<GridArray>(initGridArray(100));
  const [currentClass, setCurrentClass] = useState<GridClass>("cim");
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const [baseImageSrc, setBaseImageSrc] = useState<string | null>(null);

  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);

  const getCanvasSize = useCallback((): CanvasSize => {
    // Use gridCanvas's actual size (which matches container)
    if (gridCanvasRef.current) {
      return { width: gridCanvasRef.current.width, height: gridCanvasRef.current.height };
    }
    // Fallback to image or fallback canvas if gridCanvas not ready
    if (baseImageRef.current && baseImageRef.current.style.display !== "none") {
      const rect = baseImageRef.current.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    } else if (fallbackCanvasRef.current) {
      const rect = fallbackCanvasRef.current.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }
    return { width: 600, height: 600 }; // Varsayılan boyut
  }, [gridCanvasRef, baseImageRef, fallbackCanvasRef]);

  const drawGridAndCells = useCallback(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) return;

    const ctxGrid = gridCanvas.getContext("2d");
    if (!ctxGrid) return;

    const size = getCanvasSize();
    gridCanvas.width = size.width;
    gridCanvas.height = size.height;

    const cw = size.width / gridSize;
    const ch = size.height / gridSize;

    ctxGrid.clearRect(0, 0, size.width, size.height);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cls = gridClasses[r][c];
        if (!cls || cls === "bos") continue;
        const cfg = CLASS_CONFIG[cls];
        if (!cfg) continue;
        ctxGrid.fillStyle = cfg.color;
        ctxGrid.fillRect(c * cw, r * ch, cw, ch);
      }
    }

    ctxGrid.strokeStyle = "rgba(148,163,184,0.25)";
    ctxGrid.lineWidth = 0.6;

    for (let x = 0; x <= size.width; x += cw) {
      ctxGrid.beginPath();
      ctxGrid.moveTo(x + 0.5, 0);
      ctxGrid.lineTo(x + 0.5, size.height);
      ctxGrid.stroke();
    }
    for (let y = 0; y <= size.height; y += ch) {
      ctxGrid.beginPath();
      ctxGrid.moveTo(0, y + 0.5);
      ctxGrid.lineTo(size.width, y + 0.5);
      ctxGrid.stroke();
    }
  }, [gridSize, gridClasses, getCanvasSize]);

  const canvasCoordsToCell = useCallback((x: number, y: number) => {
    const size = getCanvasSize();
    const cw = size.width / gridSize;
    const ch = size.height / gridSize;

    const col = Math.floor(x / cw);
    const row = Math.floor(y / ch);

    if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) {
      return null;
    }
    return { row, col };
  }, [gridSize, getCanvasSize]);

  const paintAt = useCallback((x: number, y: number) => {
    const cell = canvasCoordsToCell(x, y);
    if (!cell) return;
    setGridClasses(prevGridClasses => {
      const newGridClasses = [...prevGridClasses];
      newGridClasses[cell.row] = [...newGridClasses[cell.row]];
      newGridClasses[cell.row][cell.col] = currentClass;
      return newGridClasses;
    });
  }, [canvasCoordsToCell, currentClass]);

  const updateStatsAndScores = useCallback(() => {
    const totalCells = gridSize * gridSize;
    const initialPercents: { [key in GridClass]: number } = Object.fromEntries(
      Object.keys(CLASS_CONFIG).map(key => [key, 0])
    ) as { [key in GridClass]: number };

    if (!totalCells) return {
      percents: initialPercents,
      scores: { NEI: 0, SWE: 0, HEAT: 0, TCI: 0, BCI: 0, UCIS: 0 }
    };

    const counts: { [key in GridClass]: number } = Object.fromEntries(
      Object.keys(CLASS_CONFIG).map(key => [key, 0])
    ) as { [key in GridClass]: number };

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cls = gridClasses[r][c] || "bos";
        counts[cls]++;
      }
    }

    const percents: { [key in GridClass]: number } = Object.fromEntries(
      Object.keys(counts).map(key => [key, (counts[key as GridClass] / totalCells) * 100])
    ) as { [key in GridClass]: number };

    const pCim = percents["cim"] || 0;
    const pToprak = percents["toprak"] || 0;
    const pAgacH = percents["agac_hafif"] || 0;
    const pAgacY = percents["agac_yogun"] || 0;
    const pGecirgen = percents["gecirgen"] || 0;
    const pAsfalt = percents["asfalt"] || 0;
    const pBeton = percents["beton"] || 0;
    const pSu = percents["su"] || 0;
    const pBina = percents["bina"] || 0;

    const canopyPercent = pAgacH + pAgacY;
    const greenPercent = canopyPercent + pCim + pToprak + pGecirgen;
    const waterPercent = pSu;
    const permeablePercent = pCim + pToprak + pGecirgen + canopyPercent;
    const asphaltPercent = pAsfalt;
    const concretePercent = pBeton;
    const sealedPercent = pAsfalt + pBeton + pBina;

    let NEI = greenPercent * 1.1 - sealedPercent * 0.2;
    NEI = clamp(NEI, 0, 100);

    let SWE = canopyPercent * 0.7 + waterPercent * 1.0;
    SWE = clamp(SWE, 0, 100);

    const heatBad = asphaltPercent * 1.2 + concretePercent * 1.0 + pBina * 0.8;
    const heatGood = greenPercent * 0.5 + waterPercent * 0.7;
    let HEAT = 100 - (heatBad - heatGood);
    HEAT = clamp(HEAT, 0, 100);

    let TCI = (NEI * 0.4 + SWE * 0.6);
    TCI = clamp(TCI, 0, 100);

    let BCI = canopyPercent * 0.6 + waterPercent * 0.4;
    BCI = clamp(BCI, 0, 100);

    const UCIS = clamp(
      0.30 * NEI +
      0.25 * SWE +
      0.20 * HEAT +
      0.15 * TCI +
      0.10 * BCI,
      0,
      100
    );

    return {
      percents,
      scores: { NEI, SWE, HEAT, TCI, BCI, UCIS }
    };
  }, [gridSize, gridClasses]);

  useEffect(() => {
    drawGridAndCells();
  }, [gridClasses, drawGridAndCells]);

  // Window resize event handler
  useEffect(() => {
    const handleResize = () => {
      drawGridAndCells();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGridAndCells]);

  // Base image onload handler
  useEffect(() => {
    const image = baseImageRef.current;
    if (!image) return;

    const handleImageLoad = () => {
      if (image.style.display === "none") {
        image.style.display = "block";
        if (fallbackCanvasRef.current) {
          fallbackCanvasRef.current.style.display = "none";
        }
      }
      drawGridAndCells();
      setGridClasses(initGridArray(gridSize)); // Reset grid when new image loaded
    };

    image.addEventListener("load", handleImageLoad);

    return () => {
      image.removeEventListener("load", handleImageLoad);
    };
  }, [drawGridAndCells, gridSize]);

  return {
    gridSize,
    setGridSize,
    gridClasses,
    currentClass,
    setCurrentClass,
    isPainting,
    setIsPainting,
    baseImageSrc,
    setBaseImageSrc,
    gridCanvasRef,
    baseImageRef,
    fallbackCanvasRef,
    drawGridAndCells,
    canvasCoordsToCell,
    paintAt,
    updateStatsAndScores,
  };
};

