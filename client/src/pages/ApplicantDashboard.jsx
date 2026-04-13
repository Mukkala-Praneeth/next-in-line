import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function ApplicantDashboard() {
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'applicant') {
      navigate('/applicant/login');
    }
  }, []);

  const checkStatus = async () => {
    setError('');
    setMessage('');
    try {
      const res = await API.get(`/applications/status/${jobId}`);
      setStatus(res.data.data);
    } catch (err) {
      setStatus(null);
      setError(err.response?.data?.message || 'Error checking status');
    }
  };

  const applyToJob = async () => {
    setError('');
    setMessage('');
    try {
      const res = await API.post(`/applications/jobs/${jobId}/apply`);
      setMessage(res.data.message);
      setStatus(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error applying');
    }
  };

  const acknowledge = async () => {
    setError('');
    setMessage('');
    try {
      const res = await API.post(`/applications/${status.id}/acknowledge`);
      setMessage('Promotion acknowledged!');
      setStatus(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error acknowledging');
    }
  };

  const withdraw = async () => {
    setError('');
    setMessage('');
    try {
      await API.post(`/applications/${status.id}/withdraw`);
      setMessage('Application withdrawn.');
      setStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error withdrawing');
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/applicant/login');
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'active': return '#2d8a4e';
      case 'waitlisted': return '#d4a017';
      case 'hired': return '#1a73e8';
      case 'rejected': return '#c0392b';
      case 'withdrawn': return '#888';
      default: return '#333';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Applicant Dashboard</h2>
        <button onClick={logout} style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Logout</button>
      </div>

      {error && <p style={{ color: 'red', background: '#ffe0e0', padding: 10, borderRadius: 4 }}>{error}</p>}
      {message && <p style={{ color: 'green', background: '#e0ffe0', padding: 10, borderRadius: 4 }}>{message}</p>}

      <div style={card}>
        <h3>Job Actions</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Enter Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4, flex: 1 }}
          />
          <button onClick={applyToJob} style={btnPrimary}>Apply</button>
          <button onClick={checkStatus} style={{ ...btnPrimary, background: '#444' }}>Check Status</button>
        </div>
      </div>

      {status && (
        <div style={{ ...card, marginTop: 20 }}>
          <h3>Your Application Status</h3>

          <div style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: 20,
            background: getStatusColor(status.status),
            color: 'white',
            fontWeight: 'bold',
            fontSize: 18,
            marginBottom: 15
          }}>
            {status.status.toUpperCase()}
          </div>

          {status.status === 'waitlisted' && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>
                Queue Position: #{status.queue_position}
              </p>
              {status.decay_count > 0 && (
                <p style={{ color: 'red', fontSize: 14 }}>
                  You have been decayed {status.decay_count} time(s). Decay level: {status.decay_level}
                </p>
              )}
            </div>
          )}

          {status.status === 'active' && status.promoted_at && !status.acknowledged_at && (
            <div style={{ marginTop: 15, background: '#fff3cd', padding: 15, borderRadius: 4 }}>
              <p style={{ margin: '0 0 10px', fontWeight: 'bold' }}>⚠️ You've been promoted! Acknowledge to keep your spot.</p>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#666' }}>
                Promoted at: {new Date(status.promoted_at).toLocaleString()}
              </p>
              <button onClick={acknowledge} style={{ ...btnPrimary, background: '#2d8a4e' }}>
                ✅ Acknowledge Promotion
              </button>
            </div>
          )}

          {status.status === 'active' && status.acknowledged_at && (
            <p style={{ color: 'green', marginTop: 10 }}>✅ You have acknowledged your promotion.</p>
          )}

          {status.status === 'active' && (
            <button onClick={withdraw} style={{ ...btnPrimary, background: '#c0392b', marginTop: 15 }}>
              Withdraw Application
            </button>
          )}

          {status.status === 'waitlisted' && (
            <button onClick={withdraw} style={{ ...btnPrimary, background: '#c0392b', marginTop: 15 }}>
              Withdraw Application
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const card = { background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' };
const btnPrimary = { padding: '10px 20px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };