import React from 'react';

const RiskMeter = ({ score, size = 'md' }) => {
  const normalized = Math.min(100, Math.max(0, score || 0));

  const getColor = () => {
    if (normalized < 31) return '#10b981';
    if (normalized < 71) return '#f59e0b';
    return '#ef4444';
  };

  const getLabel = () => {
    if (normalized < 31) return 'Safe';
    if (normalized < 71) return 'Warning';
    return 'High Risk';
  };

  const color = getColor();
  const dim = size === 'sm' ? 60 : size === 'lg' ? 120 : 80;
  const strokeWidth = size === 'sm' ? 4 : 3.5;
  const fontSize = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const subFontSize = size === 'sm' ? 5 : 6;

  return (
    <div style={{ position: 'relative', width: dim, height: dim, display: 'inline-block' }}>
      <svg width={dim} height={dim} viewBox="0 0 36 36"
        style={{ transform: 'rotate(-90deg)', filter: normalized >= 71 ? `drop-shadow(0 0 6px ${color})` : 'none' }}>
        {/* Background ring */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${normalized}, 100`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.5s ease' }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <span style={{ fontSize: fontSize + 4, fontWeight: 900, color, lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>
          {Math.round(normalized)}
        </span>
        {size !== 'sm' && (
          <span style={{ fontSize: subFontSize, color: '#64748b', fontWeight: 600, letterSpacing: '0.03em' }}>
            {getLabel().toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
};

export default RiskMeter;