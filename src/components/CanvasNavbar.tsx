import React from 'react';

interface CanvasNavbarProps {
  onShow3D?: () => void;
  locationInfo?: string;
}

const CanvasNavbar: React.FC<CanvasNavbarProps> = ({ onShow3D, locationInfo = "No location set" }) => {
  return (
    <div id="canvasNavbar">
      <button className="navbar-btn show-3d-btn" onClick={onShow3D}>
        Show 3D
      </button>
      <div className="navbar-location">
        {locationInfo}
      </div>
    </div>
  );
};

export default CanvasNavbar;

