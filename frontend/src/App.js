import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Interview from './pages/Interview';
import AdminDashboard from './pages/AdminDashboard';
import CandidateDetail from './pages/CandidateDetail';
import Report from './pages/Report';

// ─── Parse and validate the JWT stored in localStorage ────────────
const getAuthState = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { token: null, role: null };

    // Decode payload (no verification — server validates on each request)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { token: null, role: null };
    }
    return { token, role: payload.role };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { token: null, role: null };
  }
};

// ─── Route guards ─────────────────────────────────────────────────
const ProtectedRoute = ({ element, requiredRole }) => {
  const { token, role } = getAuthState();
  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/interview'} replace />;
  }
  return element;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Candidate-only */}
        <Route
          path="/interview"
          element={<ProtectedRoute element={<Interview />} requiredRole="candidate" />}
        />

        {/* Admin-only */}
        <Route
          path="/admin"
          element={<ProtectedRoute element={<AdminDashboard />} requiredRole="admin" />}
        />
        <Route
          path="/candidate/:id"
          element={<ProtectedRoute element={<CandidateDetail />} requiredRole="admin" />}
        />
        <Route
          path="/report/:sessionId"
          element={<ProtectedRoute element={<Report />} requiredRole="admin" />}
        />

        {/* Default: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;