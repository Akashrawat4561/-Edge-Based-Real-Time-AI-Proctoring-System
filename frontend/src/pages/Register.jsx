import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'candidate'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#84cc16', '#10b981'];
    return { score, label: labels[score], color: colors[score] };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, role: formData.role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Registration failed');

      setSuccess(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setTimeout(() => navigate(data.user.role === 'admin' ? '/admin' : '/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0e1a', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(124,58,237,0.08) 0%, transparent 50%)', padding: '24px 24px' }}>

      <div className="animate-slide-down" style={{ width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            marginBottom: 14, boxShadow: '0 8px 30px rgba(124,58,237,0.4)'
          }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
          </div>
          <h1 className="gradient-text" style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>
            Create Account
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Join ProctorAI Examination Platform</p>
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: 32 }}>
          {success && (
            <div className="toast-success animate-slide-down" style={{ marginBottom: 20, fontSize: 14 }}>
              ✅ Registration successful! Redirecting...
            </div>
          )}
          {error && (
            <div className="toast-danger animate-slide-down" style={{ marginBottom: 20, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Role tabs */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 24, padding: 4,
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.07)'
            }}>
              {[['candidate', '👤 Candidate'], ['admin', '⚙️ Admin']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setFormData({ ...formData, role: val })}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                    background: formData.role === val ? 'linear-gradient(135deg, #3b82f6, #7c3aed)' : 'transparent',
                    color: formData.role === val ? 'white' : '#64748b',
                    boxShadow: formData.role === val ? '0 4px 12px rgba(59,130,246,0.4)' : 'none'
                  }}>
                  {lbl}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>
                FULL NAME
              </label>
              <input name="name" type="text" value={formData.name} onChange={handleChange}
                required className="form-input" placeholder="John Doe" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>
                EMAIL ADDRESS
              </label>
              <input name="email" type="email" value={formData.email} onChange={handleChange}
                required className="form-input" placeholder="you@example.com" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>
                PASSWORD
              </label>
              <input name="password" type="password" value={formData.password} onChange={handleChange}
                required minLength="6" className="form-input" placeholder="Min. 6 characters" />
              {formData.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.07)',
                        transition: 'all 0.3s'
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strength.color, marginTop: 4 }}>{strength.label}</p>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.05em' }}>
                CONFIRM PASSWORD
              </label>
              <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                required className="form-input" placeholder="Repeat password" />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent',
                    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite'
                  }} />
                  Creating account...
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ color: '#64748b', fontSize: 14 }}>Already have an account? </span>
            <Link to="/login" style={{ color: '#3b82f6', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Register;