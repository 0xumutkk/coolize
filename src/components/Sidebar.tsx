import React, { useEffect, useState } from 'react';
import { CLASS_CONFIG } from '../utils/constants';

interface SidebarProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  currentClass: keyof typeof CLASS_CONFIG;
  setCurrentClass: (cls: keyof typeof CLASS_CONFIG) => void;
  setBaseImageSrc: (src: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  gridSize,
  setGridSize,
  currentClass,
  setCurrentClass,
  setBaseImageSrc,
}) => {
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({
    vegetation: false,
    surface: false,
    building: false,
  });
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [mapMarker, setMapMarker] = useState<{ x: number; y: number } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBaseImageSrc(url);
    } else {
      setBaseImageSrc(null);
    }
  };

  const handleGridSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGridSize(parseInt(e.target.value, 10));
  };

  const handlePaletteClick = (cls: keyof typeof CLASS_CONFIG) => {
    setCurrentClass(cls);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleLocationSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationSearch(e.target.value);
  };

  const handleLocationSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationSearch.trim()) {
      // Mock-up: Random position for marker
      const randomX = Math.random() * 80 + 10; // 10-90%
      const randomY = Math.random() * 80 + 10; // 10-90%
      setMapMarker({ x: randomX, y: randomY });
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMapMarker({ x, y });
  };

  // Mock-up categories with options
  const categories = {
    vegetation: [
      { id: 'veg1', label: 'Grass', color: 'rgba(22,163,74,0.6)' },
      { id: 'veg2', label: 'Tree Light', color: 'rgba(34,197,94,0.7)' },
      { id: 'veg3', label: 'Tree Dense', color: 'rgba(22,101,52,0.8)' },
    ],
    surface: [
      { id: 'surf1', label: 'Asphalt', color: 'rgba(75,85,99,0.7)' },
      { id: 'surf2', label: 'Concrete', color: 'rgba(156,163,175,0.7)' },
      { id: 'surf3', label: 'Permeable Stone', color: 'rgba(74,222,128,0.7)' },
    ],
    building: [
      { id: 'bld1', label: 'Residential', color: 'rgba(15,23,42,0.9)' },
      { id: 'bld2', label: 'Commercial', color: 'rgba(30,41,59,0.9)' },
      { id: 'bld3', label: 'Industrial', color: 'rgba(51,65,85,0.9)' },
    ],
  };

  useEffect(() => {
    const initialActiveButton = document.querySelector(`.palette-item[data-class="${currentClass}"]`);
    if (initialActiveButton) {
      initialActiveButton.classList.add('active');
    }
  }, [currentClass]);

  return (
    <aside id="sidebar">

      <div className="section">
        <div className="section-header">
          <span className="section-number">1</span>
          <h2>Upload Image</h2>
        </div>
        <label htmlFor="imageLoader">Plan / top view (PNG/JPEG)</label>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="imageLoader"
            accept="image/png,image/jpeg"
            onChange={handleImageChange}
            className="file-input"
          />
          <label htmlFor="imageLoader" className="file-input-label">
            <span className="file-input-icon">📄</span>
            <span className="file-input-text">Select File</span>
          </label>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">2</span>
          <h2>Grid Resolution</h2>
        </div>
        <label htmlFor="gridSizeSelect">Cell count (N x N)</label>
        <div className="select-wrapper">
          <select
            id="gridSizeSelect"
            onChange={handleGridSizeChange}
            value={gridSize}
            className="custom-select"
          >
            <option value="25">25 x 25 (very fast)</option>
            <option value="50">50 x 50 (fast)</option>
            <option value="75">75 x 75 (medium)</option>
            <option value="100">100 x 100 (detailed)</option>
          </select>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">3</span>
          <h2>Surface / NBS Palette</h2>
        </div>
        <p className="instruction-text">Select a category → choose from sub-options</p>
        <div id="palette-categories">
          {/* Vegetation Category */}
          <div className="palette-category">
            <button
              className="palette-category-header"
              onClick={() => toggleCategory('vegetation')}
            >
              <span className="category-icon">🌿</span>
              <span className="category-label">Vegetation</span>
              <span className={`category-arrow ${openCategories.vegetation ? 'open' : ''}`}>▼</span>
            </button>
            {openCategories.vegetation && (
              <div className="palette-category-content">
                {categories.vegetation.map((item) => (
                  <button
                    key={item.id}
                    className={`palette-item ${currentClass === item.id ? 'active' : ''}`}
                    data-class={item.id}
                    style={{ backgroundColor: item.color }}
                    onClick={() => handlePaletteClick(item.id as keyof typeof CLASS_CONFIG)}
                    title={item.label}
                  >
                    <span className="palette-item-label">{item.label}</span>
                    {currentClass === item.id && <span className="palette-item-check">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Surface Category */}
          <div className="palette-category">
            <button
              className="palette-category-header"
              onClick={() => toggleCategory('surface')}
            >
              <span className="category-icon">🛣️</span>
              <span className="category-label">Surface</span>
              <span className={`category-arrow ${openCategories.surface ? 'open' : ''}`}>▼</span>
            </button>
            {openCategories.surface && (
              <div className="palette-category-content">
                {categories.surface.map((item) => (
                  <button
                    key={item.id}
                    className={`palette-item ${currentClass === item.id ? 'active' : ''}`}
                    data-class={item.id}
                    style={{ backgroundColor: item.color }}
                    onClick={() => handlePaletteClick(item.id as keyof typeof CLASS_CONFIG)}
                    title={item.label}
                  >
                    <span className="palette-item-label">{item.label}</span>
                    {currentClass === item.id && <span className="palette-item-check">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Building Category */}
          <div className="palette-category">
            <button
              className="palette-category-header"
              onClick={() => toggleCategory('building')}
            >
              <span className="category-icon">🏢</span>
              <span className="category-label">Building</span>
              <span className={`category-arrow ${openCategories.building ? 'open' : ''}`}>▼</span>
            </button>
            {openCategories.building && (
              <div className="palette-category-content">
                {categories.building.map((item) => (
                  <button
                    key={item.id}
                    className={`palette-item ${currentClass === item.id ? 'active' : ''}`}
                    data-class={item.id}
                    style={{ backgroundColor: item.color }}
                    onClick={() => handlePaletteClick(item.id as keyof typeof CLASS_CONFIG)}
                    title={item.label}
                  >
                    <span className="palette-item-label">{item.label}</span>
                    {currentClass === item.id && <span className="palette-item-check">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">4</span>
          <h2>Location</h2>
        </div>
        <form onSubmit={handleLocationSearchSubmit} className="location-search-form">
          <div className="location-search-wrapper">
            <input
              type="text"
              className="location-search-input"
              placeholder="Search location..."
              value={locationSearch}
              onChange={handleLocationSearch}
            />
            <button type="submit" className="location-search-btn">
              🔍
            </button>
          </div>
        </form>
        <div className="map-container" onClick={handleMapClick}>
          <div className="map-mockup">
            <div className="map-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="map-grid-line"></div>
              ))}
            </div>
            {mapMarker && (
              <div
                className="map-marker"
                style={{
                  left: `${mapMarker.x}%`,
                  top: `${mapMarker.y}%`,
                }}
              >
              </div>
            )}
            {!mapMarker && (
              <div className="map-placeholder">
                <span className="map-placeholder-icon"></span>
                <span className="map-placeholder-text">Click to set location</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;