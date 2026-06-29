import React from 'react';

interface CanvasNavbarProps {
  onShow3D?: () => void;
  locationInfo?: string;
  isQAMode?: boolean;
  onToggleQA?: () => void;
}

const CanvasNavbar: React.FC<CanvasNavbarProps> = ({
  onShow3D,
  locationInfo = 'No location set',
  isQAMode = false,
  onToggleQA,
}) => {
  return (
    <div id="canvasNavbar">
      <div className="navbar-btn-group">
        <button className="navbar-btn show-3d-btn" onClick={onShow3D}>
          Show 3D
        </button>
        <button
          className={`navbar-btn qa-mode-btn${isQAMode ? ' qa-mode-btn--active' : ''}`}
          onClick={onToggleQA}
          title="Quick OSM climate analysis"
        >
          {isQAMode ? '← Canvas' : 'Quick Analysis'}
        </button>
      </div>
      <div className="navbar-location">{locationInfo}</div>
    </div>
  );
};

export default CanvasNavbar;
