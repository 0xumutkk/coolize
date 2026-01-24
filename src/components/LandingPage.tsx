import React, { useRef, useState, useEffect } from 'react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const firstCard = container.querySelector<HTMLElement>('.tool-card');
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : 400;
      const scrollAmount = cardWidth;
      const currentScroll = container.scrollLeft;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const targetScroll = direction === 'left'
        ? Math.max(0, currentScroll - scrollAmount)
        : Math.min(maxScrollLeft, currentScroll + scrollAmount);

      carouselRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleNavClick = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    setActiveSection(sectionId);
  };

  const handleLoginClick = () => {
    window.alert('Login functionality is coming soon.');
  };

  const handleCarouselKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollCarousel('right');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollCarousel('left');
    }
  };

  useEffect(() => {
    const sectionIds = ['hero', 'features', 'how-it-works', 'pricing', 'company', 'faq', 'blog'];

    const handleScroll = () => {
      let current = 'hero';
      const offset = 140;

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset && rect.bottom > offset) {
          current = id;
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  return (
    <div id="landing-page">
      {/* Skip link for screen readers and keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <nav className="landing-navbar" aria-label="Main navigation">
        <div className="navbar-container">
          <div className="navbar-left">
            <div className="navbar-logo">Coolize</div>
            <div className={`navbar-menu ${isMobileMenuOpen ? 'open' : ''}`}>
              <div className="nav-link-wrapper">
                <a
                  href="#features"
                  className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
                  onClick={() => handleNavClick('features')}
                >
                  Product
                </a>
                <span className="nav-arrow">▼</span>
              </div>
              <a
                href="#how-it-works"
                className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
                onClick={() => handleNavClick('how-it-works')}
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className={`nav-link ${activeSection === 'pricing' ? 'active' : ''}`}
                onClick={() => handleNavClick('pricing')}
              >
                Pricing
              </a>
              <a
                href="#company"
                className={`nav-link ${activeSection === 'company' ? 'active' : ''}`}
                onClick={() => handleNavClick('company')}
              >
                Company
              </a>
              <a
                href="#blog"
                className={`nav-link ${activeSection === 'blog' ? 'active' : ''}`}
                onClick={() => handleNavClick('blog')}
              >
                Blog
              </a>
            </div>
          </div>
          <div className="navbar-right">
            <button 
              className="navbar-toggle" 
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              ☰
            </button>
            <button className="nav-btn login" onClick={handleLoginClick}>Log In</button>
            <button className="nav-btn signup" onClick={onEnterApp}>Sign Up</button>
          </div>
        </div>
      </nav>

      <main id="main-content" role="main">
      {/* Hero Section */}
      <section id="hero" className="hero-section" aria-labelledby="hero-title">
        <div className="hero-container">
          <div className="hero-left">
            <div className="hero-badge">nature based solution</div>
            <h1 id="hero-title" className="hero-title">Microclimate Adaptation</h1>
            <p className="hero-description">
            Urban spaces are modeled using a layered, pixel-based approach to generate AI-driven microclimate scores; outdoor areas are analyzed through microclimate profiling, and nature-based strategies are proposed to mitigate the urban heat island effect and improve microclimatic performance.            </p>
            <button className="hero-cta" onClick={onEnterApp}>Get Started</button>
            <div className="scroll-hint">
              Scroll to see how Coolize works ↓
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image-grid">
              <div className="grid-item item-1">
                <img
                  src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop"
                  alt="Urban climate analysis overview"
                  className="grid-item-image"
                  loading="lazy"
                />
              </div>
              <div className="grid-item item-2">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=600&fit=crop"
                  alt="Project area heat map preview"
                  className="grid-item-image"
                  loading="lazy"
                />
              </div>
              <div className="grid-item item-3">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop"
                  alt="Climate score breakdown card"
                  className="grid-item-image"
                  loading="lazy"
                />
              </div>
              <div className="grid-item item-4">
                <img
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop"
                  alt="Green space optimization diagram"
                  className="grid-item-image"
                  loading="lazy"
                />
              </div>
              <div className="grid-item item-5">
                <img
                  src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop"
                  alt="Water management strategy layout"
                  className="grid-item-image"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section" aria-labelledby="features-title">
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
                    alt="Screenshot of the Coolize climate analysis interface" 
                    className="app-preview-image"
                    loading="lazy"
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
            <h2 id="features-title" className="features-title">Turning Urban Climate Data into Real Decisions</h2>
            <p className="features-description">
              Coolize focuses on what actually matters for urban climate analysis: clear visuals, reliable scoring, and actionable strategies you can use in real projects.
            </p>
            <div className="feature-cards">
              <div className="feature-card">
                <div className="feature-icon">
                  <div className="icon-design">🎨</div>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">1. Design-Focused</h3>
                  <p className="feature-text">
                    Technical data → design input<br/>
                    Not just numbers, but interpretable results
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <div className="icon-lightning">⚡</div>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">2. Fast and Lightweight</h3>
                  <p className="feature-text">
                    Alternative to hour-long simulations<br/>
                    In browser, instantly
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <div className="icon-project">🏗️</div>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">3. Real Project Ready</h3>
                  <p className="feature-text">
                    Competitions, preliminary projects, masterplans<br/>
                    Suitable for municipal and public scale
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="how-it-works" className="steps-section" aria-labelledby="steps-title">
        <div className="steps-container">
          <h2 id="steps-title" className="steps-title">Microclimate strategies in 3 steps</h2>
          <p className="steps-subtitle">
            No software download or complex tutorials required. Coolize reduces climate analysis to three clear, repeatable steps.
          </p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-image">
                {/* Image will be added here */}
              </div>
              <div className="step-icon">
                <div className="icon-upload">↑</div>
              </div>
              <h3 className="step-title">1. Upload or Select Your Project Area</h3>
              <p className="step-text">
                Drag and drop your site image, select your work area from the map, or use our grid tool to define the analysis area. Progress is tracked instantly on screen.
              </p>
            </div>
            <div className="step-card">
              <div className="step-image">
                {/* Image will be added here */}
              </div>
              <div className="step-icon">
                <div className="icon-order">⇄</div>
              </div>
              <h3 className="step-title">2. AI Analysis & Strategy Development</h3>
              <p className="step-text">
                AI recognizes and analyzes these surfaces to calculate microclimate scores and develop tailored strategies.
              </p>
            </div>
            <div className="step-card">
              <div className="step-image">
                {/* Image will be added here */}
              </div>
              <div className="step-icon">
                <div className="icon-download">↓</div>
              </div>
              <h3 className="step-title">3. Get Your Climate Score</h3>
              <p className="step-text">
                Click Calculate to get a detailed climate score with guidance on heat, green space and water strategies for your design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section" aria-labelledby="pricing-title">
        <div className="pricing-container">
          <h2 id="pricing-title" className="pricing-title">Simple pricing for studios of any size</h2>
          <p className="pricing-subtitle">
            Start with a free plan for quick studies, then upgrade when you’re ready to bring Coolize into your daily workflow.
          </p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3 className="pricing-plan-name">Starter</h3>
              <p className="pricing-price">$0<span>/month</span></p>
              <ul className="pricing-features">
                <li>Up to 3 climate studies</li>
                <li>Core climate score outputs</li>
                <li>Export basic reports</li>
              </ul>
              <button className="pricing-cta">Use for Free</button>
            </div>
            <div className="pricing-card pricing-card-featured">
              <h3 className="pricing-plan-name">Studio</h3>
              <p className="pricing-price">$19<span>/month</span></p>
              <ul className="pricing-features">
                <li>Unlimited climate studies</li>
                <li>Advanced score breakdowns</li>
                <li>Export branded PDF reports</li>
              </ul>
              <button className="pricing-cta">Get Studio</button>
            </div>
            <div className="pricing-card">
              <h3 className="pricing-plan-name">Enterprise</h3>
              <p className="pricing-price">Let’s talk</p>
              <ul className="pricing-features">
                <li>Custom integrations</li>
                <li>Team onboarding sessions</li>
                <li>Priority support</li>
              </ul>
              <button className="pricing-cta">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Company / About Section */}
      <section id="company" className="company-section" aria-labelledby="company-title">
        <div className="company-container">
          <h2 id="company-title" className="company-title">Designed for urban climate professionals</h2>
          <p className="company-subtitle">
            Coolize is built for architects, urban designers and climate consultants who need fast, visual climate insights during design.
          </p>
          <div className="company-grid">
            <div className="company-card">
              <h3 className="company-card-title">Our mission</h3>
              <p className="company-card-text">
                Make professional urban climate analysis accessible to every project team, not just specialized research groups.
              </p>
            </div>
            <div className="company-card">
              <h3 className="company-card-title">How we work</h3>
              <p className="company-card-text">
                We partner with practitioners, test on real city projects, and prioritize clear, explainable outputs over black-box scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Support Section */}
      <section id="faq" className="faq-section" aria-labelledby="faq-title">
        <div className="faq-container">
          <h2 id="faq-title" className="faq-title">Frequently asked questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3 className="faq-question">What kind of input do I need?</h3>
              <p className="faq-answer">
                You can start with a simple top-view project image or diagram. The grid tool helps you translate it into analyzable climate categories.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Is Coolize a replacement for full simulation tools?</h3>
              <p className="faq-answer">
                Coolize focuses on fast, early-phase guidance. It complements, rather than replaces, detailed CFD or energy simulations.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">How accurate are the climate scores?</h3>
              <p className="faq-answer">
                Scores are based on transparent rules about vegetation, surface and building ratios. They are optimized for comparability between design options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools Section */}
      <section
        className="related-tools-section"
        aria-labelledby="related-tools-title"
        role="region"
      >
        <div className="related-tools-container">
          <h2 id="related-tools-title" className="related-tools-title">Related Tools</h2>
          <div className="tools-carousel-wrapper">
            <button 
              className="carousel-nav-btn carousel-nav-left" 
              aria-label="Previous related tools"
              onClick={() => scrollCarousel('left')}
            >
              <span>‹</span>
            </button>
            <div
              className="tools-carousel"
              ref={carouselRef}
              role="list"
              aria-label="Related tools carousel"
            >
              <div className="tool-card tool-card-1" role="listitem">
                <div className="tool-badge">Popular</div>
                <div className="tool-content">
                  <h3 className="tool-title">Urban Heat Island Analyzer</h3>
                  <p className="tool-description">
                    Analyze urban heat patterns, identify hotspots, and get recommendations for temperature reduction strategies.
                  </p>
                </div>
              </div>
              <div className="tool-card tool-card-2" role="listitem">
                <div className="tool-badge">Popular</div>
                <div className="tool-content">
                  <h3 className="tool-title">Green Space Optimizer</h3>
                  <p className="tool-description">
                    Optimize vegetation distribution, calculate canopy coverage, and plan green infrastructure improvements.
                  </p>
                </div>
              </div>
              <div className="tool-card tool-card-3" role="listitem">
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
              aria-label="Next related tools"
              onClick={() => scrollCarousel('right')}
            >
              <span>›</span>
            </button>
          </div>
        </div>
      </section>

      {/* Blog / Articles Section */}
      <section id="blog" className="articles-section" aria-labelledby="articles-title">
        <div className="articles-container">
          <h2 id="articles-title" className="articles-title">From the Coolize climate guide</h2>
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
      <footer className="landing-footer" aria-label="Coolize site footer">
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
      </main>
    </div>
  );
};

export default LandingPage;
