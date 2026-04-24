import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CompanyLogin from './pages/CompanyLogin';
import CompanyDashboard from './pages/CompanyDashboard';
import ApplicantLogin from './pages/ApplicantLogin';
import ApplicantDashboard from './pages/ApplicantDashboard';

function App() {
  return (
    <BrowserRouter>
      <div>
        <nav style={{
          background: '#1a1a2e',
          color: 'white',
          padding: '14px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <a href="/" style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Next In Line
          </a>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/company/login" style={{ color: '#ccc', fontSize: 14, fontWeight: 500 }}>Company</a>
            <a href="/applicant/login" style={{ color: '#ccc', fontSize: 14, fontWeight: 500 }}>Applicant</a>
          </div>
        </nav>

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