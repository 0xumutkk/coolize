import React, { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import TopNavbar from './components/TopNavbar';
import { useGrid } from './hooks/useGrid';

function App() {
  const [showApp, setShowApp] = useState(false);
  const {
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
    paintAt,
    updateStatsAndScores,
    drawGridAndCells,
  } = useGrid();

  const handleEnterApp = () => {
    setShowApp(true);
  };

  const handleLogout = () => {
    setShowApp(false);
  };

  const handleMyWorks = () => {
    // TODO: Implement my works functionality
    console.log('My Works clicked');
  };

  if (!showApp) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return (
    <div id="app-container">
      <TopNavbar onLogout={handleLogout} onMyWorks={handleMyWorks} />
      <div id="app-content">
        <Sidebar
          gridSize={gridSize}
          setGridSize={setGridSize}
          currentClass={currentClass}
          setCurrentClass={setCurrentClass}
          setBaseImageSrc={setBaseImageSrc}
        />
        <MainArea
          gridSize={gridSize}
          gridClasses={gridClasses}
          isPainting={isPainting}
          setIsPainting={setIsPainting}
          baseImageSrc={baseImageSrc}
          gridCanvasRef={gridCanvasRef}
          baseImageRef={baseImageRef}
          fallbackCanvasRef={fallbackCanvasRef}
          paintAt={paintAt}
          updateStatsAndScores={updateStatsAndScores}
          drawGridAndCells={drawGridAndCells}
        />
      </div>
    </div>
  );
}

export default App;
