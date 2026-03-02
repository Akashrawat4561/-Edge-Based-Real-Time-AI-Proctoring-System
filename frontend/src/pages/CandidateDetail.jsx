import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import EventTimeline from '../components/EventTimeline';
import { EVENT_RISK_SCORES } from '../utils/constants';

const CandidateDetail = () => {
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline'); // timeline | analytics
  const token = localStorage.getItem('token');

  useEffect(() => {
    Promise.all([
      axios.get(`${process.env.REACT_APP_API_URL}/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`${process.env.REACT_APP_API_URL}/admin/candidate-sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: [] }))
    ]).then(([evRes, sessRes]) => {
      setEvents(evRes.data);
      setSessions(sessRes.data || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Compute stats
  const eventTypes = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1;
    return acc;
  }, {});

  const totalRisk = events.reduce((sum, e) => {
    const base = EVENT_RISK_SCORES[e.eventType] ?? 10;
    return sum + base * (e.confidence || 0.5);
  }, 0);

  const avgConfidence = events.length ?
    events.reduce((s, e) => s + (e.confidence || 0), 0) / events.length : 0;

  const getRiskBadge = (score) => {
    if (score < 31) return { label: 'Safe', class: 'risk-badge-safe' };
    if (score < 71) return { label: 'Warning', class: 'risk-badge-warning' };
    return { label: 'High Risk', class: 'risk-badge-danger' };
  };

  const badge = getRiskBadge(Math.min(100, totalRisk));

  const getEventIcon = (type) => {
    if (type?.includes('Face')) return '👤';
    if (type?.includes('Phone') || type?.includes('cell')) return '📱';
    if (type?.includes('Voice') || type?.includes('Audio')) return '🔊';
    if (type?.includes('Tab')) return '🪟';
    if (type?.includes('Book')) return '📚';
    if (type?.includes('Person')) return '🧑';
    if (type?.includes('Dev')) return '🔧';
    if (type?.includes('Copy')) return '📋';
    if (type?.includes('Fullscreen')) return '🖥️';
    if (type?.includes('Looking')) return '👀';
    return '⚠️';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: 15 }}>Loading candidate data...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a' }}>
      {/* HEADER */}
      <div style={{ background: 'rgba(10,14,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/admin" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: 22 }}>←</Link>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Candidate Detail</h1>
            <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Candidate ID: <span className="mono" style={{ color: '#64748b' }}>{id}</span></p>
          </div>
        </div>
        <Link to={`/report/${sessions[0]?._id || id}`} style={{
          background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
          color: 'white', textDecoration: 'none', padding: '8px 20px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
        }}>
          📊 View Full Report
        </Link>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 28px' }}>

        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Events', value: events.length, icon: '📋', color: '#3b82f6' },
            { label: 'Risk Score', value: Math.round(Math.min(100, totalRisk)), icon: '⚡', color: totalRisk > 70 ? '#ef4444' : totalRisk > 30 ? '#f59e0b' : '#10b981' },
            { label: 'Avg Confidence', value: `${Math.round(avgConfidence * 100)}%`, icon: '🎯', color: '#06b6d4' },
            { label: 'Status', value: badge.label, icon: totalRisk < 31 ? '✅' : totalRisk < 71 ? '⚠️' : '🚨', color: totalRisk < 31 ? '#10b981' : totalRisk < 71 ? '#f59e0b' : '#ef4444' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {s.label.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* EVENT BREAKDOWN */}
        {Object.keys(eventTypes).length > 0 && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Event Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(eventTypes)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = Math.round((count / events.length) * 100);
                  const riskBase = EVENT_RISK_SCORES[type] ?? 10;
                  const color = riskBase >= 40 ? '#ef4444' : riskBase >= 25 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>
                          <span>{getEventIcon(type)}</span> {type}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>
                          {count}x
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TABS */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20, padding: 4,
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content'
        }}>
          {[['timeline', '📋 Timeline'], ['analytics', '📈 Graph']].map(([val, lbl]) => (
            <button key={val} onClick={() => setActiveTab(val)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === val ? 'rgba(59,130,246,0.8)' : 'transparent',
              color: activeTab === val ? 'white' : '#64748b'
            }}>{lbl}</button>
          ))}
        </div>

        {/* Event Timeline / Graph */}
        <div className="card" style={{ padding: '24px' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <p style={{ color: '#64748b', fontSize: 16 }}>No suspicious events recorded for this candidate.</p>
            </div>
          ) : (
            <EventTimeline events={events} showTab={activeTab} />
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CandidateDetail;