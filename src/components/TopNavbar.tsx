import React, { useState, useRef, useEffect } from 'react';

interface TopNavbarProps {
  onLogout?: () => void;
  onMyWorks?: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ onLogout, onMyWorks }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleAccountClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMyWorks = () => {
    setIsDropdownOpen(false);
    if (onMyWorks) {
      onMyWorks();
    }
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div id="topNavbar">
      <div className="top-navbar-content">
        <div className="top-navbar-left">
          <div className="top-navbar-brand">
            <h1 className="top-navbar-title">Coolize</h1>
            <small className="top-navbar-subtitle">Climate Guide</small>
          </div>
        </div>
        <div className="top-navbar-right" ref={dropdownRef}>
          <button 
            id="accountBtn" 
            onClick={handleAccountClick}
            className={isDropdownOpen ? 'active' : ''}
          >
            <span className="account-text">Account</span>
          </button>
          {isDropdownOpen && (
            <div id="accountDropdown">
              <button className="dropdown-item" onClick={handleMyWorks}>
                My Works
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;

