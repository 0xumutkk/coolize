import React, { useState, useEffect } from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import TopNavbar from './components/TopNavbar';
import { useGrid } from './hooks/useGrid';

type SelectedLocation = {
  name: string;
  lat: number;
  lon: number;
} | null;

function App() {
  const [showApp, setShowApp] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);

  useEffect(() => {
    // Set initial body class
    if (!showApp) {
      document.body.classList.add('landing-active');
    } else {
      document.body.classList.remove('landing-active');
    }
  }, [showApp]);

  useEffect(() => {
    // Set initial class on mount
    document.body.classList.add('landing-active');
    return () => {
      document.body.classList.remove('landing-active');
    };
  }, []);
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
          onLocationSelect={setSelectedLocation}
          selectedLocation={selectedLocation}
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
          locationInfo={
            selectedLocation
              ? `${selectedLocation.name} (${selectedLocation.lat.toFixed(3)}, ${selectedLocation.lon.toFixed(3)})`
              : 'No location set'
          }
        />
      </div>
    </div>
  );
}

export default App;
