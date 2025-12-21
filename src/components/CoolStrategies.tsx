import React from 'react';

interface CoolStrategiesProps {
  scores: {
    NEI: number;
    SWE: number;
    HEAT: number;
    TCI: number;
    BCI: number;
    UCIS: number;
  };
}

const CoolStrategies: React.FC<CoolStrategiesProps> = ({ scores }) => {
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

  const visualAnalysis = {
    strengths: [
      'Strong water management infrastructure',
      'Good distribution of green spaces',
      'Effective use of permeable materials'
    ],
    weaknesses: [
      'Limited canopy coverage in central areas',
      'High concentration of sealed surfaces',
      'Insufficient shade in pedestrian zones'
    ],
    opportunities: [
      'Potential for rooftop gardens',
      'Space available for additional tree planting',
      'Opportunity to retrofit existing buildings'
    ]
  };

  return (
    <div id="coolStrategiesPanel">
      <h3>Cool Strategies</h3>
      
      {/* Visual Analysis Section */}
      <div className="strategies-section">
        <h4 className="section-title">Visual Analysis</h4>
        <div className="analysis-grid">
          <div className="analysis-card strengths">
            <div className="analysis-header">
              <h5>Strengths</h5>
            </div>
            <ul className="analysis-list">
              {visualAnalysis.strengths.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="analysis-card weaknesses">
            <div className="analysis-header">
              <h5>Weaknesses</h5>
            </div>
            <ul className="analysis-list">
              {visualAnalysis.weaknesses.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div className="analysis-card opportunities">
            <div className="analysis-header">
              <h5>Opportunities</h5>
            </div>
            <ul className="analysis-list">
              {visualAnalysis.opportunities.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Solution Strategies Section */}
      <div className="strategies-section">
        <h4 className="section-title">Solution Strategies</h4>
        <div className="strategies-grid">
          {strategies.map((strategy, index) => (
            <div key={index} className="strategy-card">
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

      {/* Recommendations Section */}
      <div className="strategies-section">
        <h4 className="section-title">Recommendations</h4>
        <div className="recommendations-list">
          <div className="recommendation-item">
            <span className="rec-number">1</span>
            <div className="rec-content">
              <h5>Immediate Actions (0-3 months)</h5>
              <p>Focus on quick wins: Add temporary shade structures, implement water retention systems, and begin tree planting in identified priority zones.</p>
            </div>
          </div>
          <div className="recommendation-item">
            <span className="rec-number">2</span>
            <div className="rec-content">
              <h5>Short-term Improvements (3-6 months)</h5>
              <p>Replace high-impact sealed surfaces with permeable alternatives, establish green corridors, and enhance existing vegetation coverage.</p>
            </div>
          </div>
          <div className="recommendation-item">
            <span className="rec-number">3</span>
            <div className="rec-content">
              <h5>Long-term Strategy (6-12 months)</h5>
              <p>Develop comprehensive master plan integrating all strategies, establish monitoring systems, and create sustainable maintenance protocols.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoolStrategies;

