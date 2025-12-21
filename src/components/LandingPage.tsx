import React, { useRef } from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      const currentScroll = carouselRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      carouselRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };
  return (
    <div id="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <div className="navbar-logo">Coolize</div>
            <div className="navbar-menu">
              <div className="nav-link-wrapper">
                <a href="#features" className="nav-link">Product</a>
                <span className="nav-arrow">▼</span>
              </div>
              <a href="#how-it-works" className="nav-link">How It Works</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#company" className="nav-link">Company</a>
              <a href="#blog" className="nav-link">Blog</a>
            </div>
          </div>
          <div className="navbar-right">
            <button className="nav-btn login">Log In</button>
            <button className="nav-btn signup" onClick={onEnterApp}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-left">
            <div className="hero-badge">#1 ONLINE CLIMATE ANALYSIS TOOL</div>
            <h1 className="hero-title">Climate Score Analysis</h1>
            <p className="hero-description">
              Say goodbye to complex climate assessments - with one click, our AI will analyze your urban area's climate performance for you.
            </p>
            <button className="hero-cta" onClick={onEnterApp}>Get Started</button>
          </div>
          <div className="hero-right">
            <div className="hero-image-grid">
              <div className="grid-item item-1"></div>
              <div className="grid-item item-2"></div>
              <div className="grid-item item-3"></div>
              <div className="grid-item item-4"></div>
              <div className="grid-item item-5"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <div className="features-left">
            <div className="video-player">
              <div className="player-window">
                <div className="player-controls">
                  <span className="control-dot red"></span>
                  <span className="control-dot yellow"></span>
                  <span className="control-dot green"></span>
                </div>
                <div className="player-content">
                  <img 
                    src="/app-preview.svg" 
                    alt="Coolize App Preview" 
                    className="app-preview-image"
                    onError={(e) => {
                      // Fallback to PNG or JPG if SVG not found
                      const target = e.target as HTMLImageElement;
                      if (target.src.endsWith('.svg')) {
                        target.src = '/app-preview.png';
                      } else if (target.src.endsWith('.png')) {
                        target.src = '/app-preview.jpg';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="features-right">
            <div className="features-badge">AI ANALYSIS</div>
            <h2 className="features-title">Climate analysis is simple.</h2>
            <p className="features-description">
              A climate analysis tool doesn't need hundreds of features. To achieve the desired result, it only needs three things.
            </p>
            <div className="feature-cards">
              <div className="feature-card">
                <div className="feature-icon">
                  <div className="icon-square"></div>
                </div>
                <h3 className="feature-title">User-Friendly Interface</h3>
                <p className="feature-text">
                  No steep learning curves. Analyze your urban area with just a few clicks, no installation required.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <div className="icon-lightning">⚡</div>
                </div>
                <h3 className="feature-title">Lightning-Fast Processing</h3>
                <p className="feature-text">
                  Using the latest technology for fast processing, you can get your climate score without losing any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="how-it-works" className="steps-section">
        <div className="steps-container">
          <h2 className="steps-title">3 simple steps to analyze climate</h2>
          <p className="steps-subtitle">
            No software download or complex tutorials required. Our tools reduce climate analysis to three easy steps.
          </p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">
                <div className="icon-upload">↑</div>
              </div>
              <h3 className="step-title">1. You Upload</h3>
              <p className="step-text">
                Drag and drop your project image or use our grid tool. Progress will be shown until the upload is complete.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <div className="icon-order">⇄</div>
              </div>
              <h3 className="step-title">2. Select Categories</h3>
              <p className="step-text">
                Choose your area categories: vegetation, surfaces, and buildings to define your urban space.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <div className="icon-download">↓</div>
              </div>
              <h3 className="step-title">3. Get Results</h3>
              <p className="step-text">
                Simply click the Calculate button to get your comprehensive climate score and recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools Section */}
      <section className="related-tools-section">
        <div className="related-tools-container">
          <h2 className="related-tools-title">Related Tools</h2>
          <div className="tools-carousel-wrapper">
            <button 
              className="carousel-nav-btn carousel-nav-left" 
              aria-label="Previous"
              onClick={() => scrollCarousel('left')}
            >
              <span>‹</span>
            </button>
            <div className="tools-carousel" ref={carouselRef}>
              <div className="tool-card tool-card-1">
                <div className="tool-badge">Popular</div>
                <div className="tool-content">
                  <h3 className="tool-title">Urban Heat Island Analyzer</h3>
                  <p className="tool-description">
                    Analyze urban heat patterns, identify hotspots, and get recommendations for temperature reduction strategies.
                  </p>
                </div>
              </div>
              <div className="tool-card tool-card-2">
                <div className="tool-badge">Popular</div>
                <div className="tool-content">
                  <h3 className="tool-title">Green Space Optimizer</h3>
                  <p className="tool-description">
                    Optimize vegetation distribution, calculate canopy coverage, and plan green infrastructure improvements.
                  </p>
                </div>
              </div>
              <div className="tool-card tool-card-3">
                <div className="tool-badge">New</div>
                <div className="tool-content">
                  <h3 className="tool-title">Water Management Planner</h3>
                  <p className="tool-description">
                    Design permeable surfaces, plan water retention systems, and optimize surface water evaporation strategies.
                  </p>
                </div>
              </div>
            </div>
            <button 
              className="carousel-nav-btn carousel-nav-right" 
              aria-label="Next"
              onClick={() => scrollCarousel('right')}
            >
              <span>›</span>
            </button>
          </div>
        </div>
      </section>

      {/* Related Articles Section */}
      <section className="articles-section">
        <div className="articles-container">
          <h2 className="articles-title">Related Articles</h2>
          <div className="articles-scroll">
            <div className="article-card">Urban Heat Island Effect</div>
            <div className="article-card">Green Infrastructure Benefits</div>
            <div className="article-card">Water Management Strategies</div>
            <div className="article-card">Thermal Comfort in Cities</div>
            <div className="article-card">Bioclimate Optimization</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">Coolize</div>
              <p className="footer-tagline">Making professional climate analysis more accessible with AI</p>
              <div className="footer-contact">
                <p>Coolize Studio, Inc.</p>
                <p>12747 Olive Blvd. Suite 300, Creve Coeur, MO 63141</p>
                <p>+1 (951) 732-8284</p>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4 className="footer-column-title">Product</h4>
                <ul className="footer-link-list">
                  <li><a href="#features">Climate Score Analysis</a></li>
                  <li><a href="#features">Heat Island Analyzer</a></li>
                  <li><a href="#features">Green Space Optimizer</a></li>
                  <li><a href="#features">View All Features</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Support</h4>
                <ul className="footer-link-list">
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#support">Support Center</a></li>
                  <li><a href="#feedback">Feedback</a></li>
                  <li><a href="#partnership">Partnership</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Company</h4>
                <ul className="footer-link-list">
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#contact">Contact Us</a></li>
                  <li><a href="#blog">Blog</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Legal</h4>
                <ul className="footer-link-list">
                  <li><a href="#privacy">Privacy</a></li>
                  <li><a href="#terms">Terms of Use</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-social">
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2024 Coolize. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
