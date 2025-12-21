import React from 'react';

interface SpeedometerProps {
  score: number;
}

const Speedometer: React.FC<SpeedometerProps> = ({ score }) => {
  const width = 280;
  const height = 160;
  const centerX = width / 2;
  const centerY = height;
  const radius = 130;
  const startAngle = 180; // degrees (left)
  const endAngle = 0; // degrees (right)

  // Convert degrees to radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Calculate arc path
  const startAngleRad = toRadians(startAngle);
  const endAngleRad = toRadians(endAngle);
  
  const startX = centerX + radius * Math.cos(startAngleRad);
  const startY = centerY + radius * Math.sin(startAngleRad);
  const endX = centerX + radius * Math.cos(endAngleRad);
  const endY = centerY + radius * Math.sin(endAngleRad);

  const largeArcFlag = 0; // For semicircle
  const sweepFlag = 1; // Clockwise

  const arcPath = `M ${startX},${startY} A ${radius},${radius} 0 ${largeArcFlag},${sweepFlag} ${endX},${endY}`;

  // Calculate needle rotation
  const needleRotation = (score / 100) * 180 - 90;

  // Calculate tick positions
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = startAngle + (i * (endAngle - startAngle)) / 10;
    const angleRad = toRadians(angle);
    const tickX = centerX + radius * Math.cos(angleRad);
    const tickY = centerY + radius * Math.sin(angleRad);
    return { x: tickX, y: tickY, angle };
  });

  // Label positions
  const label0X = startX - 3;
  const label0Y = startY + 18;
  const label50X = centerX;
  const label50Y = centerY - radius - 8;
  const label100X = endX + 3;
  const label100Y = endY + 18;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="speedometerGradient" gradientUnits="userSpaceOnUse" x1={startX} y1={startY} x2={endX} y2={endY}>
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="pivotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      {/* Background - transparent */}

      {/* Arc path with gradient */}
      <path
        d={arcPath}
        fill="none"
        stroke="url(#speedometerGradient)"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Tick marks */}
      {ticks.map((tick, i) => {
        const tickAngleRad = toRadians(tick.angle);
        const tickStartX = centerX + (radius - 2) * Math.cos(tickAngleRad);
        const tickStartY = centerY + (radius - 2) * Math.sin(tickAngleRad);
        const tickEndX = centerX + radius * Math.cos(tickAngleRad);
        const tickEndY = centerY + radius * Math.sin(tickAngleRad);
        
        return (
          <line
            key={i}
            x1={tickStartX}
            y1={tickStartY}
            x2={tickEndX}
            y2={tickEndY}
            stroke="#000000"
            strokeWidth="2"
          />
        );
      })}

      {/* Labels */}
      <text
        x={label0X}
        y={label0Y}
        fill="#ef4444"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
      >
        0
      </text>
      <text
        x={label50X}
        y={label50Y}
        fill="#ffffff"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
      >
        50
      </text>
      <text
        x={label100X}
        y={label100Y}
        fill="#14532d"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
      >
        100
      </text>

      {/* Needle */}
      <g transform={`translate(${centerX},${centerY}) rotate(${needleRotation})`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-radius}
          stroke="#000000"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Pivot dot */}
        <circle
          cx={0}
          cy={0}
          r={10}
          fill="url(#pivotGradient)"
          stroke="#808080"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
};

export default Speedometer;

