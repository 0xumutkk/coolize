import React from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div id="landing-page">
      <div className="landing-content">
        <h1 className="landing-title">Coolize</h1>
        <p className="landing-subtitle">Climate Guide</p>
        <div className="landing-buttons">
          <button className="landing-btn primary" onClick={onEnterApp}>
            Check Score
          </button>
          <button className="landing-btn secondary" onClick={onEnterApp}>
            Analize via AI
            <span className="soon-badge">soon</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

