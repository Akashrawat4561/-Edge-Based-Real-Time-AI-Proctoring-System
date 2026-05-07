import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [step, setStep] = useState(1); // 1=credentials, 2=device-check
  const [formData, setFormData] = useState({ email: '', password: '', examId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [networkOk, setNetworkOk] = useState(navigator.onLine);
  const navigate = useNavigate();

  // Animated particles
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 4 + 2
    }))
  );

  useEffect(() => {
    const handleOnline = () => setNetworkOk(true);
    const handleOffline = () => setNetworkOk(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
        email: formData.email, password: formData.password
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (formData.examId) localStorage.setItem('examId', formData.examId);

      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        setStep(2); // device check step
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const requestDevicePermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraGranted(true);
      setMicGranted(true);
    } catch {
      setError('Camera and microphone access is required for the exam.');
    }
  };

  const proceedToInterview = () => {
    if (cameraGranted && micGranted) {
      navigate('/interview');
    } else {
      setError('Please grant camera and microphone permissions before proceeding.');
    }
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0a0e1a' }}>

      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="animate-float" style={{
          position: 'absolute', left: `${p.left}%`, top: `${p.top}%`,
          width: p.size, height: p.size,
          background: 'rgba(59,130,246,0.4)', borderRadius: '50%',
          animationDelay: `${p.delay}s`, pointerEvents: 'none'
        }} />
      ))}

      <div className="animate-slide-down" style={{ width: '100%', maxWidth: 460, padding: '0 24px', zIndex: 10 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            marginBottom: 20, boxShadow: '0 12px 40px rgba(59, 130, 246, 0.4)',
            position: 'relative'
          }}>
            <span style={{ fontSize: 32 }}>🛡️</span>
            <div style={{
              position: 'absolute', inset: -4, borderRadius: 24,
              border: '2px solid rgba(59,130,246,0.3)', pointerEvents: 'none'
            }} />
          </div>
          <h1 className="gradient-text" style={{ fontSize: 36, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            ProctorAI
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: 0, fontWeight: 500 }}>
            Next-Gen Secure Examination Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass-premium" style={{ borderRadius: 28, padding: '40px 44px', border: '1px solid rgba(255,255,255,0.1)' }}>

          {step === 1 && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#f1f5f9' }}>
                  Welcome Back
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                  Enter your credentials to access the secure portal
                </p>
              </div>

              {error && (
                <div className="toast-danger animate-slide-down" style={{ marginBottom: 24, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                    EMAIL ADDRESS
                  </label>
                  <input name="email" type="email" required value={formData.email}
                    onChange={handleChange} className="form-input"
                    placeholder="name@company.com" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                    PASSWORD
                  </label>
                  <input name="password" type="password" required value={formData.password}
                    onChange={handleChange} className="form-input"
                    placeholder="••••••••" />
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                    EXAM ID (OPTIONAL)
                  </label>
                  <input name="examId" type="text" value={formData.examId}
                    onChange={handleChange} className="form-input"
                    placeholder="EXAM-2024-X" />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700 }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span className="animate-spin" style={{
                        width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                        borderRadius: '50%', display: 'inline-block'
                      }} />
                      Verifying...
                    </span>
                  ) : 'Sign In To Portal →'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>New candidate? </span>
                <Link to="/register" style={{ color: 'var(--accent-blue)', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginLeft: 4 }}>
                  Create Account
                </Link>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#f1f5f9' }}>
                  Device Check
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                  We need to ensure your setup meets requirements
                </p>
              </div>

              {error && (
                <div className="toast-danger animate-slide-down" style={{ marginBottom: 24, fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
                {[
                  { label: 'Camera Access', icon: '📷', ok: cameraGranted },
                  { label: 'Microphone Access', icon: '🎙️', ok: micGranted },
                  { label: 'Network Connection', icon: '⚡', ok: networkOk },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderRadius: 16,
                    background: item.ok ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.ok ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: item.ok ? '#e2e8f0' : '#94a3b8' }}>{item.label}</span>
                    </span>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.ok ? '#10b981' : 'rgba(255,255,255,0.05)',
                      fontSize: 12
                    }}>
                      {item.ok ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {!cameraGranted ? (
                <button className="btn-primary" onClick={requestDevicePermissions}
                  style={{ width: '100%', padding: '16px', fontSize: 16, marginBottom: 16 }}>
                  🎥 Grant System Permissions
                </button>
              ) : (
                <button className="btn-primary" onClick={proceedToInterview}
                  style={{
                    width: '100%', padding: '16px', fontSize: 16, marginBottom: 16,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 8px 30px rgba(16,185,129,0.3)'
                  }}>
                  🚀 Start Exam Session
                </button>
              )}
              <button className="btn-ghost" onClick={() => setStep(1)}
                style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 600 }}>
                ← Change Account
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

    </div>
  );
};

export default Login;