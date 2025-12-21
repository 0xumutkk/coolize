import React, { useEffect } from 'react';
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

  useEffect(() => {
    const initialActiveButton = document.querySelector(`.palette-item[data-class="${currentClass}"]`);
    if (initialActiveButton) {
      initialActiveButton.classList.add('active');
    }
  }, [currentClass]);

  return (
    <aside id="sidebar">
      <div className="sidebar-header">
        <h1>🌳 UrbanCool.ai</h1>
        <small>UCIS Grid Analiz Aracı</small>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">1</span>
          <h2>Görsel Yükle</h2>
        </div>
        <label htmlFor="imageLoader">Plan / üstten görünüş (PNG/JPEG)</label>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="imageLoader"
            accept="image/png,image/jpeg"
            onChange={handleImageChange}
            className="file-input"
          />
          <label htmlFor="imageLoader" className="file-input-label">
            <span className="file-input-icon">📁</span>
            <span className="file-input-text">Dosya Seç</span>
          </label>
        </div>
        <p className="help-text">💡 İstersen görsel yüklemeden de grid üzerinde çalışabilirsin.</p>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">2</span>
          <h2>Grid Çözünürlüğü</h2>
        </div>
        <label htmlFor="gridSizeSelect">Hücre sayısı (N x N)</label>
        <div className="select-wrapper">
          <select
            id="gridSizeSelect"
            onChange={handleGridSizeChange}
            value={gridSize}
            className="custom-select"
          >
            <option value="50">⚡ 50 x 50 (hızlı)</option>
            <option value="75">⚖️ 75 x 75 (orta)</option>
            <option value="100">🎯 100 x 100 (detaylı)</option>
          </select>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-number">3</span>
          <h2>Yüzey / NBS Paleti</h2>
        </div>
        <p className="instruction-text">🎨 Bir sınıf seç → grid üzerinde tıkla / sürükle</p>
        <div id="palette">
          {Object.entries(CLASS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              className={`palette-item ${currentClass === key ? 'active' : ''}`}
              data-class={key}
              style={{ backgroundColor: config.color.replace(/,(\d\.\d)\)/, ')') }}
              onClick={() => handlePaletteClick(key as keyof typeof CLASS_CONFIG)}
              title={config.label}
            >
              <span className="palette-item-label">{config.label}</span>
              {currentClass === key && <span className="palette-item-check">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;