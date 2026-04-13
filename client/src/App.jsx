import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CompanyLogin from './pages/CompanyLogin';
import CompanyDashboard from './pages/CompanyDashboard';
import ApplicantLogin from './pages/ApplicantLogin';
import ApplicantDashboard from './pages/ApplicantDashboard';

function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
        <nav style={{
          background: '#1a1a2e',
          color: 'white',
          padding: '15px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>Next In Line</h2>
          <div>
            <a href="/company/login" style={{ color: '#ccc', marginRight: 20, textDecoration: 'none' }}>Company</a>
            <a href="/applicant/login" style={{ color: '#ccc', textDecoration: 'none' }}>Applicant</a>
          </div>
        </nav>

        <div style={{ padding: '30px', maxWidth: 1000, margin: '0 auto' }}>
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