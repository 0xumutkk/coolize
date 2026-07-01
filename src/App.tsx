import React, { useState, useEffect } from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import TopNavbar from './components/TopNavbar';
import { useGrid } from './hooks/useGrid';

type SelectedLocation = { name: string; lat: number; lon: number } | null;

function App() {
  const [showApp, setShowApp] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  useEffect(() => {
    if (!showApp) document.body.classList.add('landing-active');
    else document.body.classList.remove('landing-active');
  }, [showApp]);

  useEffect(() => {
    document.body.classList.add('landing-active');
    return () => { document.body.classList.remove('landing-active'); };
  }, []);

  const {
    gridSize, setGridSize, gridClasses, currentClass, setCurrentClass,
    isPainting, setIsPainting, baseImageSrc, setBaseImageSrc,
    gridCanvasRef, baseImageRef, fallbackCanvasRef,
    paintAt, updateStatsAndScores, drawGridAndCells,
  } = useGrid();

  if (!showApp) {
    return <LandingPage onEnterApp={() => setShowApp(true)} />;
  }

  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lon]
    : [41.015, 28.979];

  return (
    <div id="app-container">
      <TopNavbar onLogout={() => setShowApp(false)} onMyWorks={() => {}} />
      <div id="app-content" className={isSidebarHidden ? 'sidebar-hidden' : ''}>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarHidden(prev => !prev)}
          aria-label={isSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
          title={isSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
        >
          <span aria-hidden="true">{isSidebarHidden ? '›' : '‹'}</span>
        </button>
        {!isSidebarHidden && (
          <Sidebar
            gridSize={gridSize}
            setGridSize={setGridSize}
            currentClass={currentClass}
            setCurrentClass={setCurrentClass}
            setBaseImageSrc={setBaseImageSrc}
            onLocationSelect={setSelectedLocation}
            selectedLocation={selectedLocation}
          />
        )}
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
          mapCenter={mapCenter}
          onLocationSelect={setSelectedLocation}
        />
      </div>
    </div>
  );
}

export default App;
