import React from 'react';
import { Link } from 'react-router-dom';
import RiskMeter from './RiskMeter';

const getRiskLevel = (score) => {
  if (score < 31) return { label: 'Safe', dot: 'safe', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' };
  if (score < 71) return { label: 'Warning', dot: 'warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' };
  return { label: 'High Risk', dot: 'danger', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' };
};

const getEventIcon = (type) => {
  if (!type) return '⚠️';
  if (type.includes('Face') || type.includes('face')) return '👤';
  if (type.includes('Phone') || type.includes('phone') || type.includes('cell')) return '📱';
  if (type.includes('Book') || type.includes('book')) return '📚';
  if (type.includes('Voice') || type.includes('Audio')) return '🔊';
  if (type.includes('Tab')) return '🪟';
  if (type.includes('Person') || type.includes('person')) return '🧑';
  if (type.includes('Dev')) return '🔧';
  return '⚠️';
};

const CandidateCard = ({ session }) => {
  const { _id, candidateId, finalRiskScore = 0, eventCount = 0, startTime } = session;
  const level = getRiskLevel(finalRiskScore);
  const isHighRisk = finalRiskScore >= 71;

  return (
    <div
      style={{
        background: level.bg,
        border: `1px solid ${level.border}`,
        borderRadius: 16,
        padding: '20px',
        transition: 'all 0.25s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isHighRisk ? `0 4px 20px rgba(239,68,68,0.15)` : 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* High risk animated border top */}
      {isHighRisk && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)',
          backgroundSize: '200% 100%',
          animation: 'gradient-shift 2s linear infinite'
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className={`status-dot ${level.dot}`} />
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: '#f1f5f9',
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {candidateId?.name || 'Unknown Candidate'}
            </h3>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidateId?.email || '—'}
          </p>
          {startTime && (
            <p style={{ fontSize: 11, color: '#475569', margin: '4px 0 0', fontFamily: 'monospace' }}>
              Started: {new Date(startTime).toLocaleTimeString()}
            </p>
          )}
        </div>
        <RiskMeter score={finalRiskScore} size="sm" />
      </div>

      {/* Risk badge + event count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: `rgba(${finalRiskScore < 31 ? '16,185,129' : finalRiskScore < 71 ? '245,158,11' : '239,68,68'},0.15)`,
          color: level.color,
          border: `1px solid ${level.border}`,
          letterSpacing: '0.04em'
        }}>
          {level.label.toUpperCase()}
        </span>
        <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚡</span> {eventCount} event{eventCount !== 1 ? 's' : ''}
        </span>
        {isHighRisk && (
          <span className="animate-blink" style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)', letterSpacing: '0.04em'
          }}>
            🚨 ALERT
          </span>
        )}
      </div>

      {/* Risk progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${Math.min(100, finalRiskScore)}%`,
            background: `linear-gradient(90deg, ${level.color}, ${finalRiskScore >= 71 ? '#f97316' : level.color})`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#334155' }}>0</span>
          <span style={{ fontSize: 10, color: '#334155' }}>100</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/candidate/${candidateId?._id}`} style={{
          flex: 1, textAlign: 'center', padding: '9px 12px',
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10, color: '#60a5fa', textDecoration: 'none',
          fontSize: 12, fontWeight: 600, transition: 'all 0.2s'
        }}
          onMouseEnter={e => { e.target.style.background = 'rgba(59,130,246,0.2)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(59,130,246,0.12)'; }}>
          📋 Timeline
        </Link>
        <Link to={`/report/${_id}`} style={{
          flex: 1, textAlign: 'center', padding: '9px 12px',
          background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 10, color: '#a78bfa', textDecoration: 'none',
          fontSize: 12, fontWeight: 600, transition: 'all 0.2s'
        }}
          onMouseEnter={e => { e.target.style.background = 'rgba(124,58,237,0.2)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(124,58,237,0.12)'; }}>
          📊 Report
        </Link>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};

export default CandidateCard;