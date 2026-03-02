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
        <div className="glass" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 18px', borderRadius: 12
        }}>
          <span className={`status-dot ${status.dot}`} />
          <span style={{ fontSize: 14, fontWeight: 600, color: status.color }}>{status.label}</span>
          {networkStatus === 'offline' && (
            <span style={{
              fontSize: 12, color: '#f59e0b', padding: '2px 8px',
              background: 'rgba(245,158,11,0.15)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)'
            }}>
              📡 OFFLINE
            </span>
          )}
        </div>

        {/* Center: Mode + Timer */}
        <div className="glass" style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 20px', borderRadius: 12
        }}>
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{monitoringMode} Mode</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>|</span>
          <span className="mono" style={{
            fontSize: 15, fontWeight: 700, color: 'white',
            letterSpacing: '0.05em'
          }}>{formatTime(elapsedTime)}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>|</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>🎥 {detectionEnabled ? 'Monitoring' : 'Paused'}</span>
        </div>

        {/* Right: Risk Meter */}
        <div className="glass" style={{
          padding: '8px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <RiskMeter score={riskScore} size="sm" />
          <div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 600 }}>RISK SCORE</p>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: status.color }}>{Math.round(riskScore)}</p>
          </div>
        </div>
      </div>

      {/* Warning Toast */}
      {warning && (
        <div className={`animate-slide-down ${warningLevel === 'danger' ? 'toast-danger' : 'toast-warning'}`}
          style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 30, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 300, textAlign: 'center'
          }}>
          {warning}
        </div>
      )}

      {/* Bottom Left: Session Info */}
      <div className="glass" style={{
        position: 'absolute', bottom: 24, left: 24, padding: '12px 18px',
        borderRadius: 12, zIndex: 20
      }}>
        <p style={{ fontSize: 11, color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>CANDIDATE</p>
        <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 6px', fontWeight: 600 }}>
          {user.name || 'Unknown'}
        </p>
        <p style={{ fontSize: 11, color: '#475569', margin: 0, fontFamily: 'monospace' }}>
          Events: {events.length} | Warnings: {warningCount}
        </p>
      </div>

      {/* Bottom Right: Controls */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end'
      }}>
        <button onClick={() => setShowEndConfirm(true)} className="btn-danger"
          style={{ padding: '12px 24px', fontSize: 14 }}>
          🚪 End Session
        </button>
        <button onClick={() => setDetectionEnabled(p => !p)} className="btn-ghost"
          style={{ padding: '8px 16px', fontSize: 12 }}>
          {detectionEnabled ? '⏸ Pause Monitoring' : '▶ Resume Monitoring'}
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="glass" style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, padding: '6px', borderRadius: 12, display: 'flex', gap: 4
      }}>
        {['Exam', 'Interview', 'Certification'].map(mode => (
          <button key={mode} onClick={() => setMonitoringMode(mode)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              background: monitoringMode === mode ? 'rgba(59,130,246,0.8)' : 'transparent',
              color: monitoringMode === mode ? 'white' : '#64748b'
            }}>
            {mode}
          </button>
        ))}
      </div>

      {/* End Confirm Dialog */}
      {showEndConfirm && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div className="glass animate-slide-down" style={{
            padding: 40, borderRadius: 20,
            maxWidth: 400, textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#f1f5f9' }}>
              End Session?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 28 }}>
              This will end your exam session. Your final risk score is{' '}
              <strong style={{ color: status.color }}>{Math.round(riskScore)}</strong>. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button className="btn-danger" onClick={handleEndSession}
                style={{ flex: 1, padding: '12px' }}>End Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;