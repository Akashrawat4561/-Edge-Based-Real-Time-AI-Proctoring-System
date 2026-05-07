import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { useBrowserEventsMonitoring } from '../hooks/useBrowserEventsMonitoring';
import { useAudioMonitoring } from '../hooks/useAudioMonitoring';
import axios from 'axios';
import RiskMeter from '../components/RiskMeter';
import { PROHIBITED_OBJECTS, DEFAULT_CONFIDENCE_THRESHOLD } from '../utils/constants';
import { calculateRiskFromEvents } from '../utils/riskCalculator';

const Interview = () => {
  const [sessionId, setSessionId] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [warning, setWarning] = useState('');
  const [warningLevel, setWarningLevel] = useState('warning'); // warning | danger
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [events, setEvents] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [monitoringMode, setMonitoringMode] = useState('Exam'); // Exam | Interview | Certification
  const [warningCount, setWarningCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [pendingEvents, setPendingEvents] = useState([]); // offline queue
  const [sessionStartTime] = useState(Date.now());
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const lookAwayStartRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const { videoRef, stream, error: webRTCError } = useWebRTC();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      // Flush pending events
      flushPendingEvents();
    };
    const handleOffline = () => setNetworkStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush offline events
  const flushPendingEvents = useCallback(async () => {
    const token = localStorage.getItem('token');
    const pending = JSON.parse(localStorage.getItem('pendingEvents') || '[]');
    if (!pending.length) return;
    for (const ev of pending) {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/events`, ev, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch { }
    }
    localStorage.removeItem('pendingEvents');
  }, []);

  // Start session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    axios.post(`${process.env.REACT_APP_API_URL}/session/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setSessionId(res.data.sessionId))
      .catch(() => setWarning('Could not start session. Please refresh.'));

    // Enter fullscreen
    try {
      document.documentElement.requestFullscreen?.();
    } catch { }

    return () => {
      clearTimeout(warningTimeoutRef.current);
    };
  }, []); // eslint-disable-line

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showAlert = useCallback((msg, level = 'warning') => {
    setWarning(msg);
    setWarningLevel(level);
    clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setWarning(''), 4000);
  }, []);

  const sendEvent = useCallback((eventType, confidence, metadata = {}) => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    const payload = { sessionId, eventType, confidence, metadata };

    if (networkStatus === 'offline') {
      // Store locally for offline edge mode
      const stored = JSON.parse(localStorage.getItem('pendingEvents') || '[]');
      stored.push(payload);
      localStorage.setItem('pendingEvents', JSON.stringify(stored));
    } else {
      axios.post(`${process.env.REACT_APP_API_URL}/events`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {
        // If request fails, store locally
        const stored = JSON.parse(localStorage.getItem('pendingEvents') || '[]');
        stored.push(payload);
        localStorage.setItem('pendingEvents', JSON.stringify(stored));
      });
    }

    setEvents(prevEvents => {
      const next = [...prevEvents, { eventType, confidence, metadata, timestamp: Date.now() }];
      setRiskScore(calculateRiskFromEvents(next));
      return next;
    });
    setWarningCount(c => c + 1);
  }, [sessionId, networkStatus]);

  // Face detection
  const onFaceDetect = useCallback((predictions) => {
    if (!detectionEnabled) return;
    if (predictions.length === 0) {
      sendEvent('No Face', 0.9);
      showAlert('⚠️ Face not visible! Please look at the camera.', 'danger');
      lookAwayStartRef.current = lookAwayStartRef.current || Date.now();
    } else if (predictions.length > 1) {
      sendEvent('Multiple Faces', 0.95);
      showAlert('🚨 Multiple faces detected!', 'danger');
      lookAwayStartRef.current = null;
    } else {
      const face = predictions[0];
      const box = face.topLeft && face.bottomRight ? {
        x1: face.topLeft[0], y1: face.topLeft[1],
        x2: face.bottomRight[0], y2: face.bottomRight[1]
      } : null;

      if (box && videoRef.current) {
        const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth || 1;
        const centerX = (box.x1 + box.x2) / 2;
        const distanceFromCenter = Math.abs(centerX - videoWidth / 2) / (videoWidth / 2);

        if (distanceFromCenter > 0.4) {
          if (!lookAwayStartRef.current) {
            lookAwayStartRef.current = Date.now();
            showAlert('👀 Looking away detected', 'warning');
          } else {
            const elapsed = (Date.now() - lookAwayStartRef.current) / 1000;
            if (elapsed > 10) {
              sendEvent('Looking Away', 0.85, { durationSeconds: elapsed });
              showAlert('⚠️ Looking away continuously for too long!', 'danger');
              lookAwayStartRef.current = null;
            }
          }
        } else {
          lookAwayStartRef.current = null;
        }
      }
    }
  }, [detectionEnabled, sendEvent, showAlert, videoRef]);

  // Object detection
  const onObjectDetect = useCallback((objects) => {
    if (!detectionEnabled) return;
    objects.forEach(obj => {
      if (PROHIBITED_OBJECTS.includes(obj.class) && obj.score > DEFAULT_CONFIDENCE_THRESHOLD) {
        const label = obj.class === 'cell phone' ? 'Phone Detected'
          : obj.class === 'book' ? 'Book Detected'
            : obj.class === 'person' ? 'Second Person Detected'
              : `${obj.class} Detected`;
        sendEvent(label, obj.score);
        showAlert(`🚨 ${label}!`, 'danger');
      }
    });
  }, [detectionEnabled, sendEvent, showAlert]);

  useFaceDetection(videoRef, onFaceDetect, detectionEnabled);
  useObjectDetection(videoRef, onObjectDetect, detectionEnabled);

  useBrowserEventsMonitoring((eventType, confidence, metadata) => {
    if (!detectionEnabled) return;
    sendEvent(eventType, confidence, metadata);
    if (eventType === 'Tab Switching') showAlert('⚠️ Tab switching detected!', 'danger');
    if (eventType === 'Fullscreen Exit') showAlert('⚠️ Please stay in fullscreen mode!', 'warning');
    if (eventType === 'Copy Paste') showAlert('⚠️ Copy/paste attempt detected!', 'warning');
    if (eventType === 'Dev Tools Open') showAlert('⚠️ Dev tools detected!', 'danger');
  }, detectionEnabled);

  useAudioMonitoring(stream, (eventType, confidence, metadata) => {
    if (!detectionEnabled) return;
    sendEvent(eventType, confidence, metadata);
    showAlert('🔊 Suspicious audio detected!', 'warning');
  }, detectionEnabled);

  const handleEndSession = async () => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/session/end`, {
        sessionId, finalRiskScore: riskScore
      }, { headers: { Authorization: `Bearer ${token}` } });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const getRiskStatus = () => {
    if (riskScore < 31) return { label: 'Safe', dot: 'safe', color: '#10b981' };
    if (riskScore < 71) return { label: 'Warning', dot: 'warning', color: '#f59e0b' };
    return { label: 'High Risk', dot: 'danger', color: '#ef4444' };
  };

  const status = getRiskStatus();

  if (webRTCError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e1a'
      }}>
        <div className="glass" style={{ maxWidth: 480, padding: 48, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📷</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>
            Camera/Microphone Access Required
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 28 }}>{webRTCError}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}
            style={{ padding: '12px 32px', fontSize: 15 }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* Camera Feed */}
      <video ref={videoRef} autoPlay muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

      {/* Gradient overlay */}
      <div className="interview-overlay" />

      {/* TOP BAR */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20
      }}>

        {/* Left: Status */}
        <div className="glass-premium" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 20px', borderRadius: 16,
          boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 0 10px ${status.color}22`
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: status.color, boxShadow: `0 0 12px ${status.color}`,
            animation: status.dot === 'danger' ? 'pulse-ring 1s infinite' : 'none'
          }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: status.color, letterSpacing: '0.02em' }}>{status.label.toUpperCase()}</span>
          {networkStatus === 'offline' && (
            <span style={{
              fontSize: 11, color: '#f59e0b', padding: '3px 10px', fontWeight: 700,
              background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)'
            }}>
              OFFLINE MODE
            </span>
          )}
        </div>

        {/* Center: Mode + Timer */}
        <div className="glass-premium" style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '12px 28px', borderRadius: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{monitoringMode}</span>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
            <span className="mono" style={{
              fontSize: 18, fontWeight: 800, color: 'white',
              letterSpacing: '0.05em', textShadow: '0 0 10px rgba(255,255,255,0.3)'
            }}>{formatTime(elapsedTime)}</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <div className="animate-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
             <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>LIVE MONITORING</span>
          </div>
        </div>

        {/* Right: Risk Meter */}
        <div className="glass-premium" style={{
          padding: '10px 24px', borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 16,
          border: `1px solid ${status.color}33`
        }}>
          <RiskMeter score={riskScore} size="sm" />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', fontWeight: 800, letterSpacing: '0.05em' }}>INTEGRITY INDEX</p>
            <p style={{ fontSize: 20, fontWeight: 900, margin: 0, color: status.color, lineHeight: 1 }}>{Math.round(100 - riskScore)}%</p>
          </div>
        </div>
      </div>

      {/* Warning Toast */}
      {warning && (
        <div className={`animate-slide-down ${warningLevel === 'danger' ? 'toast-danger' : 'toast-warning'}`}
          style={{
            position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)',
            zIndex: 30, fontSize: 15, fontWeight: 700, padding: '16px 32px', borderRadius: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
          <span style={{ fontSize: 20 }}>{warningLevel === 'danger' ? '🚨' : '⚠️'}</span>
          {warning}
        </div>
      )}

      {/* Bottom Left: Session Info */}
      <div className="glass-premium" style={{
        position: 'absolute', bottom: 32, left: 32, padding: '16px 24px',
        borderRadius: 20, zIndex: 20, minWidth: 240
      }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 800, letterSpacing: '0.05em' }}>SESSION CANDIDATE</p>
          <p style={{ fontSize: 16, color: '#f1f5f9', margin: 0, fontWeight: 800 }}>
            {user.name || 'Anonymous User'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '0 0 2px', fontWeight: 700 }}>EVENTS</p>
            <p style={{ fontSize: 14, color: '#e2e8f0', margin: 0, fontWeight: 700 }}>{events.length}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '0 0 2px', fontWeight: 700 }}>ALERTS</p>
            <p style={{ fontSize: 14, color: warningCount > 0 ? '#ef4444' : '#e2e8f0', margin: 0, fontWeight: 700 }}>{warningCount}</p>
          </div>
        </div>
      </div>

      {/* Bottom Right: Controls */}
      <div style={{
        position: 'absolute', bottom: 32, right: 32, zIndex: 20,
        display: 'flex', gap: 12
      }}>
        <button onClick={() => setDetectionEnabled(p => !p)} className="btn-ghost"
          style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, borderRadius: 16 }}>
          {detectionEnabled ? '⏸ Pause System' : '▶ Resume System'}
        </button>
        <button onClick={() => setShowEndConfirm(true)} className="btn-danger"
          style={{ padding: '12px 28px', fontSize: 14, fontWeight: 800, borderRadius: 16, boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)' }}>
          🚪 Finalize Session
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="glass-premium" style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, padding: '6px', borderRadius: 18, display: 'flex', gap: 4,
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {['Exam', 'Interview', 'Certification'].map(mode => (
          <button key={mode} onClick={() => setMonitoringMode(mode)}
            style={{
              padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: monitoringMode === mode ? 'rgba(59,130,246,0.9)' : 'transparent',
              color: monitoringMode === mode ? 'white' : 'var(--text-muted)',
              boxShadow: monitoringMode === mode ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
            }}>
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* End Confirm Dialog */}
      {showEndConfirm && (
        <div className="animate-fade-in" style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-premium animate-slide-up" style={{
            padding: 48, borderRadius: 32,
            maxWidth: 440, textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
              margin: '0 auto 24px'
            }}>⚠️</div>
            <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 16, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Finalize Session?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
              You are about to terminate the proctoring session. Your integrity index is calculated at {' '}
              <strong style={{ color: status.color, fontSize: 18 }}>{Math.round(100 - riskScore)}%</strong>. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn-ghost" onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, padding: '16px', fontWeight: 700 }}>Back to Session</button>
              <button className="btn-danger" onClick={handleEndSession}
                style={{ flex: 1, padding: '16px', fontWeight: 800 }}>Confirm & End</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Interview;