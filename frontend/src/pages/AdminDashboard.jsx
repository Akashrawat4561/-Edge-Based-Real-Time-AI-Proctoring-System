import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import CandidateCard from '../components/CandidateCard';

const REFRESH_INTERVAL = 15000; // 15s auto-refresh

const AdminDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [lastAlert, setLastAlert] = useState(null);
  const [liveEventFeed, setLiveEventFeed] = useState([]);
  const [stats, setStats] = useState({ total: 0, safe: 0, warning: 0, danger: 0 });
  const audioCtxRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Get socket and connection status from hook
  const { socket, connected, error: socketError } = useSocket(token);

  const playAlertSound = useCallback(() => {
    if (!soundAlerts) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { }
  }, [soundAlerts]);

  const fetchLiveCandidates = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/live`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setCandidates(data);

      // Recalculate stats
      const safe = data.filter(c => (c.finalRiskScore || 0) < 31).length;
      const warning = data.filter(c => (c.finalRiskScore || 0) >= 31 && (c.finalRiskScore || 0) < 71).length;
      const danger = data.filter(c => (c.finalRiskScore || 0) >= 71).length;
      setStats({ total: data.length, safe, warning, danger });
    } catch (err) {
      console.error('Failed to fetch live candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLiveCandidates();
    const interval = setInterval(fetchLiveCandidates, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLiveCandidates]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Join admin room
    socket.emit('join-admin');

    // Listen for new events
    socket.on('new-event', (data) => {
      // Add to live feed
      setLiveEventFeed(prev => [{ ...data, id: Date.now() }, ...prev.slice(0, 49)]);

      // Alert for high-risk events
      const highRisk = ['Multiple Faces', 'Phone Detected', 'person Detected', 'Dev Tools Open'];
      if (highRisk.includes(data.eventType)) {
        setLastAlert(data);
        playAlertSound();
      }

      fetchLiveCandidates();
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.off('new-event');
      }
    };
  }, [socket, fetchLiveCandidates, playAlertSound]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Filter + sort
  const filtered = candidates
    .filter(c => {
      const name = c.candidateId?.name?.toLowerCase() || '';
      const email = c.candidateId?.email?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      const score = c.finalRiskScore || 0;
      if (filterRisk === 'safe' && score >= 31) return false;
      if (filterRisk === 'warning' && (score < 31 || score >= 71)) return false;
      if (filterRisk === 'danger' && score < 71) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') return (b.finalRiskScore || 0) - (a.finalRiskScore || 0);
      if (sortBy === 'events') return (b.eventCount || 0) - (a.eventCount || 0);
      if (sortBy === 'name') return (a.candidateId?.name || '').localeCompare(b.candidateId?.name || '');
      return 0;
    });

  const getEventIcon = (type) => {
    if (type?.includes('Face')) return '👤';
    if (type?.includes('Phone') || type?.includes('cell')) return '📱';
    if (type?.includes('Audio') || type?.includes('Voice')) return '🔊';
    if (type?.includes('Tab')) return '🪟';
    if (type?.includes('Book')) return '📚';
    if (type?.includes('Person')) return '🧑';
    if (type?.includes('Dev')) return '🔧';
    if (type?.includes('Copy')) return '📋';
    if (type?.includes('Fullscreen')) return '🖥️';
    return '⚠️';
  };

  const getRiskColor = (score) => {
    if (score < 31) return '#10b981';
    if (score < 71) return '#f59e0b';
    return '#ef4444';
  };

  // Show socket connection error if any
  if (socketError) {
    console.warn('Socket connection issue:', socketError);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a' }}>

      {/* NAVBAR */}
      <nav className="admin-navbar" style={{ padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>🛡️</div>
          <span className="gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>ProctorAI</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(16,185,129,0.15)', color: '#10b981',
            border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '0.05em'
          }}>ADMIN</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Connection status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot" style={{
              background: connected ? '#10b981' : '#ef4444',
              boxShadow: connected ? '0 0 8px rgba(16,185,129,0.8)' : '0 0 8px rgba(239,68,68,0.8)',
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              animation: connected ? 'pulse-green 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot" style={{
              background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)',
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              animation: 'pulse-green 2s infinite'
            }} />
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              {stats.total} Live Sessions
            </span>
          </div>

          {/* Sound toggle */}
          <button onClick={() => setSoundAlerts(p => !p)} style={{
            background: soundAlerts ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${soundAlerts ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            fontSize: 13, color: soundAlerts ? '#60a5fa' : '#64748b', fontWeight: 600
          }}>
            {soundAlerts ? '🔔 Sound On' : '🔕 Sound Off'}
          </button>

          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 32px' }}>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Active', value: stats.total, icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
            { label: 'Safe', value: stats.safe, icon: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
            { label: 'Warning', value: stats.warning, icon: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
            { label: 'High Risk', value: stats.danger, icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 14, padding: '20px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.05em' }}>
                  {s.label.toUpperCase()}
                </p>
                <p style={{ fontSize: 32, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>
                  {s.value}
                </p>
              </div>
              <span style={{ fontSize: 32 }}>{s.icon}</span>
            </div>
          ))}
        </div>

        {/* HIGH RISK ALERT BANNER */}
        {lastAlert && (
          <div className="animate-slide-down" style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 12, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fca5a5', fontSize: 14, fontWeight: 600 }}>
              🚨 High Risk Alert: <strong>{lastAlert.eventType}</strong> detected
              — Confidence: {Math.round((lastAlert.confidence || 0) * 100)}%
              {lastAlert.timestamp && ` at ${new Date(lastAlert.timestamp).toLocaleTimeString()}`}
            </span>
            <button onClick={() => setLastAlert(null)} style={{
              background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18
            }}>✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* MAIN PANEL */}
          <div>
            {/* Search + Filter + Sort Bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 16 }}>🔍</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="form-input" style={{ paddingLeft: 40 }} />
              </div>

              <div style={{ display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                {[['all', '🌐 All'], ['safe', '🟢 Safe'], ['warning', '🟡 Warning'], ['danger', '🔴 Risk']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFilterRisk(val)} style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    background: filterRisk === val ? 'rgba(59,130,246,0.8)' : 'transparent',
                    color: filterRisk === val ? 'white' : '#64748b'
                  }}>{lbl}</button>
                ))}
              </div>

              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '10px 14px', color: '#cbd5e1', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, outline: 'none'
                }}>
                <option value="risk">Sort: Risk ↓</option>
                <option value="events">Sort: Events ↓</option>
                <option value="name">Sort: Name A-Z</option>
              </select>

              <button onClick={fetchLiveCandidates} style={{
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 10, padding: '10px 18px', color: '#60a5fa',
                cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
                🔄 Refresh
              </button>
            </div>

            {/* Candidate Grid */}
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="animate-shimmer" style={{
                    height: 180, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)'
                  }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 60, marginBottom: 20 }}>🔍</div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#475569', marginBottom: 8 }}>No Candidates Found</h3>
                <p style={{ color: '#334155', fontSize: 14 }}>
                  {candidates.length === 0 ? 'No active exam sessions at the moment.' : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
                {filtered.map(c => (
                  <CandidateCard key={c._id} session={c} />
                ))}
              </div>
            )}
          </div>

          {/* LIVE EVENT FEED SIDEBAR */}
          <div>
            <div className="glass" style={{ borderRadius: 16, padding: 20, position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Live Event Feed</h3>
                <span className="animate-blink" style={{
                  fontSize: 11,
                  color: connected ? '#10b981' : '#ef4444',
                  fontWeight: 600
                }}>
                  {connected ? '● LIVE' : '○ OFFLINE'}
                </span>
              </div>

              {liveEventFeed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                  <p style={{ color: '#475569', fontSize: 13 }}>Waiting for events...</p>
                </div>
              ) : (
                <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {liveEventFeed.map(ev => (
                    <div key={ev.id} className="animate-fade-in" style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `3px solid ${getRiskColor((ev.confidence || 0.5) * 100)}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14 }}>{getEventIcon(ev.eventType)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{ev.eventType}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: getRiskColor((ev.confidence || 0.5) * 100),
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px', borderRadius: 4
                        }}>
                          {Math.round((ev.confidence || 0) * 100)}%
                        </span>
                      </div>
                      {ev.timestamp && (
                        <p style={{ fontSize: 10, color: '#475569', margin: 0, fontFamily: 'monospace' }}>
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;