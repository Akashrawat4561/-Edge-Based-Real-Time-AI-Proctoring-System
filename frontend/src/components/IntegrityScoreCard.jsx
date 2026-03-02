import React from 'react';

/**
 * IntegrityScoreCard
 * Shows the final AI integrity score with color-coded status,
 * an animated donut, and a brief recommendation text.
 */
const IntegrityScoreCard = ({ score = 100, totalEvents = 0, duration = null }) => {
    const getStatus = (s) => {
        if (s >= 85) return { label: 'Excellent', emoji: '🏆', color: '#10b981', glow: 'rgba(16,185,129,0.3)' };
        if (s >= 70) return { label: 'Good', emoji: '✅', color: '#84cc16', glow: 'rgba(132,204,22,0.3)' };
        if (s >= 50) return { label: 'Moderate', emoji: '⚠️', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' };
        if (s >= 30) return { label: 'Suspicious', emoji: '🚨', color: '#f97316', glow: 'rgba(249,115,22,0.3)' };
        return { label: 'High Risk', emoji: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,0.3)' };
    };

    const { label, emoji, color, glow } = getStatus(score);

    return (
        <div style={{
            background: 'rgba(19,28,53,0.9)',
            border: `1px solid ${color}33`,
            borderRadius: 18,
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            boxShadow: `0 8px 32px ${glow}`,
        }}>
            {/* Donut chart */}
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <svg width="110" height="110" viewBox="0 0 36 36"
                    style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${color})` }}>
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke={color} strokeWidth="3.5"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{score}%</span>
                    <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>
                        INTEGRITY
                    </span>
                </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 26 }}>{emoji}</span>
                    <div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color, margin: 0 }}>{label}</h3>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 600 }}>
                            AI Integrity Assessment
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                    <div style={{ borderLeft: `2px solid ${color}44`, paddingLeft: 12 }}>
                        <p style={{ fontSize: 10, color: '#475569', fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.05em' }}>SCORE</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0 }}>{score}/100</p>
                    </div>
                    <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: 12 }}>
                        <p style={{ fontSize: 10, color: '#475569', fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.05em' }}>VIOLATIONS</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>{totalEvents}</p>
                    </div>
                    {duration && (
                        <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: 12 }}>
                            <p style={{ fontSize: 10, color: '#475569', fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.05em' }}>DURATION</p>
                            <p style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>{duration}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntegrityScoreCard;
