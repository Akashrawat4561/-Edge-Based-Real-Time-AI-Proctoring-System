import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import EventTimeline from '../components/EventTimeline';

const Report = () => {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/admin/report/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setReport(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [sessionId, token]);

  const handlePrint = () => window.print();

  const getIntegrityColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getIntegrityLabel = (score) => {
    if (score >= 85) return { label: 'Excellent', emoji: '🏆' };
    if (score >= 70) return { label: 'Good', emoji: '✅' };
    if (score >= 50) return { label: 'Moderate', emoji: '⚠️' };
    if (score >= 30) return { label: 'Suspicious', emoji: '🚨' };
    return { label: 'High Risk', emoji: '🔴' };
  };

  const getDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const s = Math.floor((new Date(end) - new Date(start)) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: 15 }}>Generating AI Integrity Report...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ padding: 48, borderRadius: 20, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h3 style={{ fontSize: 20, color: '#f1f5f9', marginBottom: 12 }}>Report Not Found</h3>
          <Link to="/admin" style={{ color: '#3b82f6', textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { session, events, integrityScore } = report;
  const status = getIntegrityLabel(integrityScore);
  const integrityColor = getIntegrityColor(integrityScore);
  const riskScore = session?.finalRiskScore || 0;

  // Violation categories
  const violations = {
    face: events.filter(e => e.eventType.includes('Face') || e.eventType === 'No Face' || e.eventType === 'Looking Away').length,
    object: events.filter(e => e.eventType.includes('Detected')).length,
    audio: events.filter(e => e.eventType.includes('Voice') || e.eventType.includes('Audio')).length,
    browser: events.filter(e => ['Tab Switching', 'Fullscreen Exit', 'Copy Paste', 'Dev Tools Open'].includes(e.eventType)).length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(10,14,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/admin" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 22 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>AI Integrity Report</h1>
            <p className="mono" style={{ fontSize: 11, color: '#475569', margin: 0 }}>Session: {sessionId}</p>
          </div>
        </div>
        <button onClick={handlePrint} style={{
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa', padding: '8px 20px', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, fontWeight: 600
        }}>
          🖨️ Print Report
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px' }}>

        {/* HERO INTEGRITY SCORE */}
        <div className="card" style={{
          padding: '36px 40px', marginBottom: 24,
          background: `linear-gradient(135deg, rgba(${integrityScore >= 70 ? '16,185,129' : integrityScore >= 40 ? '245,158,11' : '239,68,68'},0.08) 0%, rgba(15,22,41,0.9) 100%)`,
          border: `1px solid rgba(${integrityScore >= 70 ? '16,185,129' : integrityScore >= 40 ? '245,158,11' : '239,68,68'},0.25)`,
          display: 'flex', alignItems: 'center', gap: 40
        }}>
          {/* Donut */}
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke={integrityColor} strokeWidth="3.5"
                strokeDasharray={`${integrityScore}, 100`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${integrityColor})` }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: integrityColor }}>{integrityScore}%</span>
              <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>INTEGRITY</span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 32 }}>{status.emoji}</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: integrityColor, margin: 0 }}>
                {status.label}
              </h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              AI analysis complete. This report is based on {events.length} recorded events over
              {' '}{getDuration(session?.startTime, session?.endTime)} of monitoring.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Risk Score', val: `${Math.round(riskScore)}/100`, color: riskScore < 31 ? '#10b981' : riskScore < 71 ? '#f59e0b' : '#ef4444' },
                { label: 'Total Events', val: events.length },
                { label: 'Duration', val: getDuration(session?.startTime, session?.endTime) },
              ].map(item => (
                <div key={item.label} style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
                  <p style={{ fontSize: 11, color: '#475569', margin: '0 0 2px', fontWeight: 600, letterSpacing: '0.05em' }}>{item.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: item.color || '#e2e8f0', margin: 0 }}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CANDIDATE INFO */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', margin: '0 0 16px' }}>CANDIDATE DETAILS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Name', val: session?.candidateId?.name || 'N/A' },
              { label: 'Email', val: session?.candidateId?.email || 'N/A' },
              { label: 'Session Started', val: session?.startTime ? new Date(session.startTime).toLocaleString() : 'N/A' },
              { label: 'Session Ended', val: session?.endTime ? new Date(session.endTime).toLocaleString() : 'Still Active' },
              { label: 'Session ID', val: sessionId?.slice(-8) || 'N/A', mono: true },
              { label: 'Status', val: session?.status?.toUpperCase() || 'N/A' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 11, color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>{item.label}</p>
                <p className={item.mono ? 'mono' : ''} style={{ fontSize: 14, color: '#cbd5e1', margin: 0, fontWeight: 500 }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* VIOLATION SUMMARY */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', margin: '0 0 16px' }}>VIOLATION CATEGORIES</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Face Events', count: violations.face, icon: '👤', color: '#ef4444' },
              { label: 'Object Events', count: violations.object, icon: '📱', color: '#f97316' },
              { label: 'Audio Events', count: violations.audio, icon: '🔊', color: '#f59e0b' },
              { label: 'Browser Events', count: violations.browser, icon: '🪟', color: '#8b5cf6' },
            ].map(v => (
              <div key={v.label} style={{
                background: `rgba(${v.count > 0 ? '255,255,255' : '255,255,255'},0.03)`,
                border: `1px solid ${v.count > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 12, padding: '16px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: v.count > 0 ? v.color : '#334155', marginBottom: 4 }}>{v.count}</div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{v.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI RECOMMENDATION */}
        <div style={{
          padding: '20px 24px', marginBottom: 24, borderRadius: 14,
          background: integrityScore >= 70 ? 'rgba(16,185,129,0.08)' : integrityScore >= 40 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${integrityScore >= 70 ? 'rgba(16,185,129,0.25)' : integrityScore >= 40 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`
        }}>
          <h3 style={{ fontSize: 14, color: integrityColor, fontWeight: 700, margin: '0 0 10px' }}>
            🧠 AI Recommendation
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {integrityScore >= 85 && "The candidate demonstrated excellent integrity throughout the exam session. No significant suspicious activity was detected. The exam result can be considered fully reliable."}
            {integrityScore >= 70 && integrityScore < 85 && "The candidate showed mostly clean behavior with minor events that could be coincidental. The exam result is likely reliable. Minor review recommended."}
            {integrityScore >= 50 && integrityScore < 70 && "Moderate suspicious activity was detected during the session. Manual review of the event timeline is recommended before validating the result."}
            {integrityScore >= 30 && integrityScore < 50 && "Significant suspicious activity was detected. High probability of external assistance. This session requires immediate manual review and may need to be invalidated."}
            {integrityScore < 30 && "Critical integrity violation detected. Multiple high-confidence suspicious events were logged. Strong recommendation to invalidate this exam result and initiate a formal review."}
          </p>
        </div>

        {/* EVENT TIMELINE */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>
            📋 Event Timeline
          </h3>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#64748b' }}>No events recorded.</p>
            </div>
          ) : (
            <EventTimeline events={events} showTab="analytics" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;