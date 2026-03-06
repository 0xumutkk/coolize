import React, { useState } from 'react';
import './SaaSProducts.css';

const SaaSProducts: React.FC<{ scores: any }> = ({ scores }) => {
    const [targetTemp, setTargetTemp] = useState<number>(-0.5);

    const strategies = [
        {
            category: 'Nature Integration',
            title: 'Enhance Green Infrastructure',
            description: 'Increase vegetation coverage by 15-20% to improve NEI score. Focus on strategic placement of trees and green spaces.',
            priority: 'High',
            impact: 'Increases NEI by 8-12 points'
        },
        {
            category: 'Water Management',
            title: 'Implement Permeable Surfaces',
            description: 'Replace 30% of sealed surfaces with permeable materials to enhance water retention and reduce runoff.',
            priority: 'Medium',
            impact: 'Increases SWE by 6-10 points'
        },
        {
            category: 'Heat Management',
            title: 'Reduce Heat Island Effect',
            description: 'Add reflective surfaces and increase canopy coverage to lower ambient temperatures during peak hours.',
            priority: 'High',
            impact: 'Increases HEAT by 10-15 points'
        },
        {
            category: 'Thermal Comfort',
            title: 'Optimize Shade Distribution',
            description: 'Create strategic shade zones using trees and structures to improve thermal comfort throughout the day.',
            priority: 'Medium',
            impact: 'Increases TCI by 7-12 points'
        },
        {
            category: 'Bioclimate',
            title: 'Enhance Biodiversity',
            description: 'Introduce native plant species and create habitat corridors to support local wildlife and ecosystem health.',
            priority: 'Low',
            impact: 'Increases BCI by 5-8 points'
        }
    ];

    return (
        <div id="saasProductsPanel" className="strategies-section saas-section">
            <h3 className="section-title">Premium Analysis & Expert Solutions</h3>

            <div className="analysis-grid saas-grid">

                {/* Card 1: Detailed Analysis & Reporting */}
                <div className="strategy-card saas-card pro-card saas-card-horizontal">
                    <div className="saas-card-media">
                        <div className="envimet-visual-wrapper">
                            <div className="envimet-gradient-mock"></div>
                            <span className="envimet-visual-badge">
                                ENVI-met Thermal Output Simulation
                            </span>
                        </div>
                    </div>

                    <div className="saas-card-content">
                        <div className="strategy-header">
                            <div className="strategy-title-group">
                                <h5 className="strategy-title">
                                    Detailed Analysis & Reporting
                                </h5>
                                <span className="strategy-priority high">Product-1 Pro</span>
                            </div>
                            <p className="strategy-category">
                                ENVI-met validated workflow
                            </p>
                        </div>

                        <div className="saas-features">
                            <p className="strategy-description">
                                Detailed surface definition, comprehensive processing of microclimate inputs, and corporate-standard reporting.
                            </p>
                            <ul className="analysis-list saas-list">
                                <li>
                                    <span className="saas-check">✓</span>
                                    Current state performance & critical area identification
                                </li>
                                <li>
                                    <span className="saas-check">✓</span>
                                    Comparative metrics and traceable formats
                                </li>
                                <li>
                                    <span className="saas-check">✓</span>
                                    GIS/BIM integration and project archive
                                </li>
                            </ul>
                        </div>

                        <div className="saas-impact-pro">
                            <button className="saas-btn-pro">
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card 2: Strategy & Scenario Development MERGED with Solution Strategies & Recommendations */}
                <div className="strategy-card saas-card premium-card saas-card-horizontal-merged" style={{ display: 'block' }}>
                    <div style={{ display: 'flex' }} className="saas-card-horizontal">
                        <div className="saas-card-media" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div className="saas-features">
                                <p className="strategy-description">
                                    The layer linking design decisions to numerical targets. Generation of tailored scenarios and feasibility analysis.
                                </p>

                                <div className="strategy-sets">
                                    <span className="strategy-set-badge">3D Vegetation</span>
                                    <span className="strategy-set-badge">Permeability</span>
                                    <span className="strategy-set-badge">Material Opt.</span>
                                    <span className="strategy-set-badge">Morphology</span>
                                </div>

                                <ul className="analysis-list saas-list">
                                    <li>
                                        <span className="saas-check premium-check">✓</span>
                                        Scenario comparison and decision support (DSS)
                                    </li>
                                    <li>
                                        <span className="saas-check premium-check">✓</span>
                                        Prioritization and feasibility
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="saas-card-content">
                            <div className="strategy-header">
                                <div className="strategy-title-group">
                                    <h5 className="strategy-title">
                                        Strategy & Scenario Development
                                    </h5>
                                    <span className="strategy-priority medium saas-badge-premium">Product-2 Premium</span>
                                </div>
                                <p className="strategy-category">
                                    Optimization by Target °C
                                </p>
                            </div>

                            <div className="target-optimization-block saas-interactive-target">
                                <div className="target-optimization-header">
                                    <div className="target-text">
                                        <p className="target-label">SELECT IMPROVEMENT TARGET</p>
                                        <h4 className="target-value">
                                            <span className="target-number">{targetTemp > 0 ? '+' : ''}{targetTemp.toFixed(1)}°C</span>
                                        </h4>
                                    </div>
                                    <div className="target-optimization-badge">
                                        Generate Interventions
                                    </div>
                                </div>

                                <div className="saas-range-wrapper">
                                    <input
                                        type="range"
                                        min="-2.0"
                                        max="0.0"
                                        step="0.1"
                                        value={targetTemp}
                                        onChange={(e) => setTargetTemp(parseFloat(e.target.value))}
                                        className="saas-range-slider"
                                        id="targetTempSlider"
                                    />
                                    <div className="saas-range-labels">
                                        <span>-2.0°C</span>
                                        <span>0.0°C</span>
                                    </div>
                                </div>
                            </div>

                            <div className="saas-impact-premium">
                                <button className="saas-btn-premium">
                                    View Scenarios
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Full-width Divider between Top section and Strategies */}
                    <div className="saas-divider"></div>

                    {/* Merged Solution Strategies content */}
                    <div className="merged-strategies-area" style={{ paddingTop: '16px' }}>
                        <h4 className="section-title" style={{ paddingLeft: '24px', marginBottom: '16px', fontSize: '18px' }}>Solution Strategies for {targetTemp.toFixed(1)}°C Target</h4>
                        <div className="strategies-grid" style={{ padding: '0 24px 24px' }}>
                            {strategies.map((strategy, index) => (
                                <div key={index} className="strategy-card" style={{ boxShadow: 'none', border: '1px solid rgba(85, 107, 47, 0.1)' }}>
                                    <div className="strategy-header">
                                        <div className="strategy-title-group">
                                            <h5 className="strategy-title">{strategy.title}</h5>
                                            <span className={`strategy-priority ${strategy.priority.toLowerCase()}`}>
                                                {strategy.priority}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="strategy-category">{strategy.category}</p>
                                    <p className="strategy-description">{strategy.description}</p>
                                    <div className="strategy-impact">
                                        <span className="impact-label">Expected Impact:</span>
                                        <span className="impact-value">{strategy.impact}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Card 3: Additional Effect Modules (Add-on License) */}
            <div className="strategy-card saas-card addon-card">
                {/* Header */}
                <div className="addon-card-header">
                    <div className="addon-header-left">
                        <div className="addon-badge-row">
                            <span className="addon-tag">Add-on License</span>
                            <span className="addon-tag addon-tag-new">New</span>
                        </div>
                        <h5 className="addon-title">Additional Effect Modules</h5>
                        <p className="addon-subtitle">
                            Expand your analysis beyond temperature — report energy, carbon, biodiversity and urban quality of life impacts in a single workflow.
                        </p>
                    </div>
                    <div className="addon-header-right">
                        <div className="addon-compliance-badge">
                            <span className="addon-compliance-icon">✦</span>
                            Sustainability & Climate Compliance Reporting
                        </div>
                    </div>
                </div>

                {/* Module Grid */}
                <div className="addon-modules-grid">
                    <div className="addon-module">
                        <div className="addon-module-icon energy-icon">⚡</div>
                        <div className="addon-module-body">
                            <h6 className="addon-module-title">Energy Efficiency Effect</h6>
                            <p className="addon-module-desc">Quantify building energy demand reduction through urban cooling interventions. Outputs compatible with LEED & BREEAM.</p>

                            <div className="addon-projection-grid">
                                <div className="projection-item">
                                    <span className="proj-label">1 Year</span>
                                    <span className="proj-value">-3,420 kWh</span>
                                </div>
                                <div className="projection-item active-proj">
                                    <span className="proj-label">5 Year</span>
                                    <span className="proj-value">-17,100 kWh</span>
                                </div>
                                <div className="projection-item">
                                    <span className="proj-label">10 Year</span>
                                    <span className="proj-value">-34,200 kWh</span>
                                </div>
                            </div>

                            <div className="addon-module-metrics">
                                <span className="addon-metric">kWh / m²·year</span>
                                <span className="addon-metric">Heating & Cooling Split</span>
                            </div>
                        </div>
                    </div>

                    <div className="addon-module">
                        <div className="addon-module-icon carbon-icon">🌿</div>
                        <div className="addon-module-body">
                            <h6 className="addon-module-title">Carbon Effect (Reduction & Sequestration)</h6>
                            <p className="addon-module-desc">Calculate CO₂ reduction from lower energy demand plus carbon sequestration from added vegetation layers.</p>

                            <div className="addon-projection-grid">
                                <div className="projection-item">
                                    <span className="proj-label">1 Year</span>
                                    <span className="proj-value">-15.4 tCO₂e</span>
                                </div>
                                <div className="projection-item active-proj">
                                    <span className="proj-label">5 Year</span>
                                    <span className="proj-value">-77.0 tCO₂e</span>
                                </div>
                                <div className="projection-item">
                                    <span className="proj-label">10 Year</span>
                                    <span className="proj-value">-154.0 tCO₂e</span>
                                </div>
                            </div>

                            <div className="addon-module-metrics">
                                <span className="addon-metric">tCO₂e / year</span>
                                <span className="addon-metric">GHG Protocol Aligned</span>
                            </div>
                        </div>
                    </div>

                    <div className="addon-module">
                        <div className="addon-module-icon bio-icon">🌱</div>
                        <div className="addon-module-body">
                            <h6 className="addon-module-title">Biodiversity Effect</h6>
                            <p className="addon-module-desc">Assess habitat connectivity, green coverage gain and species-support index from proposed interventions.</p>
                            <div className="addon-module-metrics">
                                <span className="addon-metric">Habitat Index Score</span>
                                <span className="addon-metric">GBIF Compatible</span>
                            </div>
                        </div>
                    </div>

                    <div className="addon-module">
                        <div className="addon-module-icon quality-icon">🏙️</div>
                        <div className="addon-module-body">
                            <h6 className="addon-module-title">Urban Quality of Life</h6>
                            <p className="addon-module-desc">Composite index covering thermal comfort hours, acoustic environment, air quality and walkability improvements.</p>
                            <div className="addon-module-metrics">
                                <span className="addon-metric">UQL Composite Score</span>
                                <span className="addon-metric">WHO Benchmarked</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="addon-card-footer">
                    <div className="addon-footer-info">
                        <p className="addon-footer-label">Available as individual or bundled add-on licenses. Outputs integrate directly into Product-1 and Product-2 reports.</p>
                    </div>
                    <button className="saas-btn-addon">
                        Request Module Access
                    </button>
                </div>
            </div>

        </div>
    );
};

export default SaaSProducts;
