import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFaceApiProctor } from '../hooks/useFaceApiProctor';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { useBrowserEventsMonitoring } from '../hooks/useBrowserEventsMonitoring';
import { useAudioMonitoring } from '../hooks/useAudioMonitoring';
import RiskMeter from '../components/RiskMeter';
import { calculateRiskFromEvents } from '../utils/riskCalculator';
/* global faceapi */
const faceapi = window.faceapi;

const InterviewWithFaceApi = () => {
  const [sessionId, setSessionId] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [warning, setWarning] = useState('');
  const [warningLevel, setWarningLevel] = useState('warning');
  const [events, setEvents] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [monitoringMode, setMonitoringMode] = useState('Certification');
  const [integrityScore, setIntegrityScore] = useState(100);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isFaceReady, setIsFaceReady] = useState(false);

  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const { videoRef, stream, error: webRTCError } = useWebRTC();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Start Session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    axios.post(`${process.env.REACT_APP_API_URL}/session/start`, { mode: monitoringMode }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setSessionId(res.data.sessionId))
      .catch(err => setWarning('Session Initialization Failed'));

    timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);

    // Fullscreen
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      }
    } catch { }

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  // Event Sender
  const sendEvent = useCallback((eventType, confidence, metadata = {}) => {
    if (!sessionId) return;
    const token = localStorage.getItem('token');
    const payload = { sessionId, eventType, confidence, metadata };

    axios.post(`${process.env.REACT_APP_API_URL}/events`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => { });

    setEvents(prev => {
      const next = [...prev, { eventType, confidence, metadata, timestamp: Date.now() }];
      const score = calculateRiskFromEvents(next);
      setRiskScore(score);
      setIntegrityScore(Math.max(0, 100 - score));
      return next;
    });

    setWarning(`Detected: ${eventType}`);
    setWarningLevel(confidence > 0.8 ? 'danger' : 'warning');
    clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setWarning(''), 3000);
  }, [sessionId]);

  // AI Hooks
  const { isLoaded: modelsLoaded, detections } = useFaceApiProctor(videoRef, sendEvent, true);
  useObjectDetection(videoRef, (objs) => {
    objs.forEach(o => sendEvent(`${o.class} Detected`, o.score));
  });
  useBrowserEventsMonitoring(sendEvent);
  useAudioMonitoring(stream, sendEvent);

  // Canvas Overlay for Landmarks
  useEffect(() => {
    if (!detections || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.clientWidth, height: video.clientHeight };

    faceapi.matchDimensions(canvas, displaySize);
    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks with custom style
    const landmarks = resized.landmarks;
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1;
    ctx.beginPath();
    landmarks.positions.forEach(p => {
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, 1, 0, 2 * Math.PI);
    });
    ctx.stroke();

    if (!isFaceReady) setIsFaceReady(true);
  }, [detections]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="proctor-container bg-black min-h-screen text-white overflow-hidden relative font-sans">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />

      {/* Main Viewport */}
      <div className="relative w-full h-screen flex flex-col p-6">

        {/* Header */}
        <div className="flex justify-between items-center z-20 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-xl font-bold">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">ANTIGRAVITY <span className="text-cyan-400">PRO</span></h1>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring Active
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="glass px-6 py-2 rounded-2xl flex items-center gap-4 border border-white/5">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Elapsed Time</p>
                <p className="text-xl font-mono font-bold text-cyan-400 leading-tight">{formatTime(elapsedTime)}</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Integrity</p>
                <p className="text-xl font-mono font-bold text-white leading-tight">{integrityScore}%</p>
              </div>
            </div>
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-6 py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold transition-all"
            >
              Finish Exam
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-12 gap-6 z-10 min-h-0">

          {/* Left: Feed & Radar */}
          <div className="col-span-8 flex flex-col gap-6">
            <div className="relative flex-1 rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                autoPlay
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
              />

              {/* Overlays */}
              <div className="absolute top-6 left-6 flex flex-col gap-3">
                <div className="glass px-4 py-2 rounded-xl flex items-center gap-3 border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {modelsLoaded ? 'Edge AI Loaded' : 'Warming Engine...'}
                  </span>
                </div>
                {detections && (
                  <div className="glass px-4 py-2 rounded-xl border border-white/10 animate-fade-in">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Face Expression</p>
                    <p className="text-xs font-bold text-cyan-400 capitalize">
                      {Object.keys(detections.expressions).reduce((a, b) => detections.expressions[a] > detections.expressions[b] ? a : b)}
                    </p>
                  </div>
                )}
              </div>

              {/* Warning Toast */}
              {warning && (
                <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 glass-heavy px-8 py-4 rounded-2xl border ${warningLevel === 'danger' ? 'border-red-500/50 text-red-400' : 'border-amber-500/50 text-amber-400'} flex items-center gap-4 animate-slide-up`}>
                  <span className="text-xl">⚠️</span>
                  <p className="font-bold tracking-wide">{warning}</p>
                </div>
              )}
            </div>

            {/* Bottom Panel */}
            <div className="h-32 glass rounded-3xl border border-white/5 p-6 flex items-center justify-between">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Network Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold">Stable (24ms)</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Audio Analytics</p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <span className="text-sm font-bold">No Suspicious Logic</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Objects Monitored</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">Phones, Books, Additional Persons</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl">
                <span className="text-xs font-bold text-slate-400">Mode:</span>
                <span className="text-xs font-black uppercase tracking-tighter bg-cyan-500 text-black px-2 py-0.5 rounded">CERTIFICATION</span>
              </div>
            </div>
          </div>

          {/* Right: Metrics & Insights */}
          <div className="col-span-4 flex flex-col gap-6">
            <div className="glass rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center gap-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Real-time Risk Score</h3>
              <RiskMeter score={riskScore} size="lg" />
              <div className="text-center">
                <p className={`text-4xl font-black ${riskScore > 70 ? 'text-red-500' : riskScore > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {Math.round(riskScore)}
                </p>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">Total Violations: {events.length}</p>
              </div>
            </div>

            <div className="glass rounded-3xl border border-white/5 p-6 flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Event Log</h3>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {events.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                    <span className="text-4xl mb-4">📜</span>
                    <p className="text-xs font-bold">No events logged yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {[...events].reverse().slice(0, 10).map((ev, i) => (
                      <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center animate-fade-in">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{ev.eventType}</p>
                          <p className="text-[9px] text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ev.confidence > 0.8 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                          {Math.round(ev.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEndConfirm(false)} />
          <div className="relative glass-heavy max-w-md w-full p-10 rounded-[40px] border border-white/10 text-center animate-scale-in">
            <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
              <span className="text-4xl">🏁</span>
            </div>
            <h2 className="text-2xl font-black mb-4">End Examination?</h2>
            <p className="text-slate-400 mb-10 leading-relaxed">
              You are about to finish your session. Your integrity score is <strong>{integrityScore}%</strong>. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowEndConfirm(false)} className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold transition-all">Cancel</button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 font-bold transition-all"
              >
                Confirm Finish
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .glass-heavy { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default InterviewWithFaceApi;
