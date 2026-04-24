import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import CompanyLogin from './pages/CompanyLogin';
import CompanyDashboard from './pages/CompanyDashboard';
import ApplicantLogin from './pages/ApplicantLogin';
import ApplicantDashboard from './pages/ApplicantDashboard';

function Navbar() {
  const [role, setRole] = useState(localStorage.getItem('role'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setRole(localStorage.getItem('role'));
  }, [location]);

  const logout = () => {
    localStorage.clear();
    setRole(null);
    navigate('/');
  };

  return (
    <nav style={{
      background: '#1a1a2e',
      color: 'white',
      padding: '14px 30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <a href="/" style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', textDecoration: 'none' }}>
        Next In Line
      </a>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {!role && (
          <>
            <a href="/company/login" style={navLink}>Company Login</a>
            <a href="/applicant/login" style={navLink}>Applicant Login</a>
          </>
        )}
        {role === 'company' && (
          <>
            <a href="/company/dashboard" style={navLink}>Dashboard</a>
            <button onClick={logout} style={navBtn}>Logout</button>
          </>
        )}
        {role === 'applicant' && (
          <>
            <a href="/applicant/dashboard" style={navLink}>Dashboard</a>
            <button onClick={logout} style={navBtn}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

const navLink = { color: '#ccc', fontSize: 14, fontWeight: 500, textDecoration: 'none' };
const navBtn = { background: 'transparent', color: '#ccc', border: '1px solid #555', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };

function App() {
  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <div style={{ padding: '30px', maxWidth: 960, margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<CompanyLogin />} />
            <Route path="/company/login" element={<CompanyLogin />} />
            <Route path="/company/dashboard" element={<CompanyDashboard />} />
            <Route path="/applicant/login" element={<ApplicantLogin />} />
            <Route path="/applicant/dashboard" element={<ApplicantDashboard />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;