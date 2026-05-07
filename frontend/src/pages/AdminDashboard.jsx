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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 36 }}>
          {[
            { label: 'Total Active', value: stats.total, icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', glow: 'var(--glow-blue)' },
            { label: 'Safe Sessions', value: stats.safe, icon: '🛡️', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', glow: 'var(--glow-green)' },
            { label: 'Warning', value: stats.warning, icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', glow: 'var(--glow-amber)' },
            { label: 'High Risk', value: stats.danger, icon: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', glow: 'var(--glow-red)' },
          ].map(s => (
            <div key={s.label} className="glass-premium" style={{
              borderRadius: 24, padding: '24px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: `1px solid ${s.border}`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.2), inset 0 0 20px ${s.bg}`
            }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  {s.label.toUpperCase()}
                </p>
                <p style={{ fontSize: 40, fontWeight: 900, color: s.color, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {s.value}
                </p>
              </div>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, boxShadow: `0 0 20px ${s.glow}`
              }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* HIGH RISK ALERT BANNER */}
        {lastAlert && (
          <div className="animate-slide-down" style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 16, padding: '18px 24px', marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(239,68,68,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: '#ef4444', boxShadow: '0 0 10px #ef4444',
                animation: 'pulse-ring 1s infinite'
              }} />
              <span style={{ color: '#fca5a5', fontSize: 15, fontWeight: 700 }}>
                CRITICAL ALERT: <strong style={{ color: '#fff' }}>{lastAlert.eventType}</strong> — 
                Confidence: <span style={{ color: '#ef4444' }}>{Math.round((lastAlert.confidence || 0) * 100)}%</span>
                {lastAlert.timestamp && <span style={{ opacity: 0.7, marginLeft: 8, fontWeight: 400 }}>at {new Date(lastAlert.timestamp).toLocaleTimeString()}</span>}
              </span>
            </div>
            <button onClick={() => setLastAlert(null)} style={{
              background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8',
              cursor: 'pointer', width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, transition: 'all 0.2s'
            }}>✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>

          {/* MAIN PANEL */}
          <div>
            {/* Search + Filter + Sort Bar */}
            <div className="glass" style={{
              display: 'flex', gap: 16, marginBottom: 24, padding: 12, borderRadius: 18,
              alignItems: 'center', flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }}>🔍</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by name or identity..."
                  className="form-input" style={{ paddingLeft: 48, background: 'rgba(255,255,255,0.02)', border: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 8, padding: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                {[['all', 'All'], ['safe', 'Safe'], ['warning', 'Warning'], ['danger', 'Risk']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFilterRisk(val)} style={{
                    padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
                    background: filterRisk === val ? 'rgba(59,130,246,0.9)' : 'transparent',
                    color: filterRisk === val ? 'white' : 'var(--text-muted)',
                    boxShadow: filterRisk === val ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                  }}>{lbl}</button>
                ))}
              </div>

              <button onClick={fetchLiveCandidates} className="btn-ghost" style={{
                padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span>🔄</span> Sync Data
              </button>
            </div>

            {/* Candidate Grid */}
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 20 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="animate-shimmer" style={{
                    height: 200, borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
                  }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass" style={{ textAlign: 'center', padding: '100px 40px', borderRadius: 24 }}>
                <div style={{ fontSize: 64, marginBottom: 24, filter: 'grayscale(1)' }}>🕵️</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Empty Result Set</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
                  {candidates.length === 0 ? "System is currently idle. No active proctoring sessions detected." : "No candidates match your current filter criteria."}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 20 }}>
                {filtered.map(c => (
                  <CandidateCard key={c._id} session={c} />
                ))}
              </div>
            )}
          </div>

          {/* LIVE EVENT FEED SIDEBAR */}
          <div>
            <div className="glass-premium" style={{ borderRadius: 24, padding: 24, position: 'sticky', top: 88, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>Live System Feed</h3>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px', borderRadius: 20, background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: connected ? '#10b981' : '#ef4444',
                    animation: connected ? 'pulse-green 1.5s infinite' : 'none'
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: connected ? '#10b981' : '#ef4444', letterSpacing: '0.05em' }}>
                    {connected ? 'ACTIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {liveEventFeed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📡</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Establishing stream link...</p>
                </div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }} className="custom-scroll">
                  {liveEventFeed.map(ev => (
                    <div key={ev.id} className="animate-fade-in" style={{
                      padding: '14px 16px', borderRadius: 16,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: `4px solid ${getRiskColor((ev.confidence || 0.5) * 100)}`,
                      transition: 'transform 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{getEventIcon(ev.eventType)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{ev.eventType}</span>
                        <div style={{
                          fontSize: 10, fontWeight: 900,
                          color: getRiskColor((ev.confidence || 0.5) * 100),
                          background: 'rgba(0,0,0,0.3)',
                          padding: '3px 8px', borderRadius: 6
                        }}>
                          {Math.round((ev.confidence || 0) * 100)}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                          Session: {ev.sessionId?.slice(-6) || 'N/A'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => setLiveEventFeed([])} className="btn-ghost" style={{ width: '100%', padding: '10px', fontSize: 12, fontWeight: 600 }}>
                  Clear Feed
                </button>
              </div>
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