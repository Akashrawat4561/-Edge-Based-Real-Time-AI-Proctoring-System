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

      <div className="animate-slide-down" style={{ width: '100%', maxWidth: 440, padding: '0 24px', zIndex: 10 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #3b82f6, #7c3aed)',
            marginBottom: 16, boxShadow: '0 8px 30px rgba(59,130,246,0.4)'
          }}>
            <span style={{ fontSize: 28 }}>🛡️</span>
          </div>
          <h1 className="gradient-text" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>
            ProctorAI
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            AI-Powered Secure Examination Platform
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 20, padding: 36 }}>

          {step === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' }}>
                {formData.email && false ? '' : 'Sign in to Continue'}
              </h2>

              {error && (
                <div className="toast-danger animate-slide-down" style={{ marginBottom: 20, fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    EMAIL ADDRESS
                  </label>
                  <input name="email" type="email" required value={formData.email}
                    onChange={handleChange} className="form-input"
                    placeholder="candidate@example.com" />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    PASSWORD
                  </label>
                  <input name="password" type="password" required value={formData.password}
                    onChange={handleChange} className="form-input"
                    placeholder="Enter your password" />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    EXAM ID (OPTIONAL)
                  </label>
                  <input name="examId" type="text" value={formData.examId}
                    onChange={handleChange} className="form-input"
                    placeholder="e.g. EXAM-2024-001" />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ width: '100%', padding: '14px', fontSize: 16 }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{
                        width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent',
                        borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite'
                      }} />
                      Authenticating...
                    </span>
                  ) : 'Sign In →'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>Don't have an account? </span>
                <Link to="/register" style={{ color: '#3b82f6', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                  Register here
                </Link>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 8 }}>
                    🔧 DEV CREDENTIALS
                  </p>
                  <p style={{ fontSize: 11, color: '#334155', margin: '4px 0', fontFamily: 'monospace' }}>
                    Admin: admin@example.com / password123
                  </p>
                  <p style={{ fontSize: 11, color: '#334155', margin: '4px 0', fontFamily: 'monospace' }}>
                    Candidate: candidate@example.com / password123
                  </p>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
                Device Verification
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
                Before starting your exam, we need to verify device permissions.
              </p>

              {error && (
                <div className="toast-danger animate-slide-down" style={{ marginBottom: 20, fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Checks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  { label: 'Camera Access', icon: '🎥', ok: cameraGranted },
                  { label: 'Microphone Access', icon: '🎙️', ok: micGranted },
                  { label: 'Internet Connection', icon: '🌐', ok: networkOk },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 12,
                    background: item.ok ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.ok ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1' }}>{item.label}</span>
                    </span>
                    <span style={{ fontSize: 18 }}>{item.ok ? '✅' : '⏳'}</span>
                  </div>
                ))}
              </div>

              {!cameraGranted ? (
                <button className="btn-primary" onClick={requestDevicePermissions}
                  style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 12 }}>
                  🎥 Grant Camera & Microphone Access
                </button>
              ) : (
                <button className="btn-primary" onClick={proceedToInterview}
                  style={{
                    width: '100%', padding: '14px', fontSize: 15, marginBottom: 12,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
                  }}>
                  ✅ Start Exam Session →
                </button>
              )}
              <button className="btn-ghost" onClick={() => setStep(1)}
                style={{ width: '100%', padding: '12px', fontSize: 14 }}>
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;