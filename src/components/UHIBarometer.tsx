import React from 'react';

interface UHIBarometerProps {
  score: number; // 0 = cool/safe, 100 = hot/critical
}

const UHIBarometer: React.FC<UHIBarometerProps> = ({ score }) => {
  const width = 280;
  const height = 160;
  const cx = width / 2;
  const cy = height;
  const r = 130;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startRad = toRad(180);
  const endRad = toRad(0);

  const sx = cx + r * Math.cos(startRad);
  const sy = cy + r * Math.sin(startRad);
  const ex = cx + r * Math.cos(endRad);
  const ey = cy + r * Math.sin(endRad);

  const arcPath = `M ${sx},${sy} A ${r},${r} 0 0,1 ${ex},${ey}`;

  // Needle: 0° = left (cool/blue), 180° = right (hot/red)
  const needleRotation = (score / 100) * 180 - 90;

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = 180 - i * 18;
    const rad = toRad(angle);
    return {
      x1: cx + (r - 12) * Math.cos(rad),
      y1: cy + (r - 12) * Math.sin(rad),
      x2: cx + r * Math.cos(rad),
      y2: cy + r * Math.sin(rad),
      major: i % 5 === 0,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block' }}>
      <defs>
        {/* Blue (0/cool) → Cyan → Yellow → Orange → Red (100/hot) */}
        <linearGradient id="uhiGradient" gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={ex} y2={ey}>
          <stop offset="0%"   stopColor="#3b82f6" />
          <stop offset="30%"  stopColor="#06b6d4" />
          <stop offset="55%"  stopColor="#fbbf24" />
          <stop offset="75%"  stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="pivotG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      <path d={arcPath} fill="none" stroke="url(#uhiGradient)" strokeWidth="20" strokeLinecap="round" />

      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(0,0,0,0.4)" strokeWidth={t.major ? 2 : 1} />
      ))}

      <text x={sx - 3} y={sy + 18} fill="#3b82f6" fontSize="12" fontWeight="700" textAnchor="middle">Cool</text>
      <text x={cx}     y={cy - r - 8} fill="#ffffff" fontSize="12" fontWeight="600" textAnchor="middle">50</text>
      <text x={ex + 3} y={ey + 18} fill="#ef4444" fontSize="12" fontWeight="700" textAnchor="middle">Hot</text>

      <g transform={`translate(${cx},${cy}) rotate(${needleRotation})`}>
        <line x1={0} y1={0} x2={0} y2={-r + 10} stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <circle cx={0} cy={0} r={9} fill="url(#pivotG)" stroke="#64748b" strokeWidth="2" />
      </g>
    </svg>
  );
};

export default UHIBarometer;
