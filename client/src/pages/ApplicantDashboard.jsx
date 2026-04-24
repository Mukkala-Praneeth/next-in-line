import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function ApplicantDashboard() {
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState(null);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'applicant') {
      navigate('/applicant/login');
    }
    // Live clock
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkStatus = async () => {
    setError('');
    setMessage('');
    try {
      const res = await API.get(`/applications/status/${jobId}`);
      setStatus(res.data.data);
      setHistory(null);
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
      await API.post(`/applications/${status.id}/acknowledge`);
      setMessage('Promotion acknowledged successfully!');
      checkStatus();
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

  const viewHistory = async () => {
    try {
      const res = await API.get(`/applications/${status.id}/history`);
      setHistory(res.data.data.history);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching history');
    }
  };

  const getDecayCountdown = (promotedAt, decayWindowHours) => {
    if (!promotedAt) return null;
    const promoted = new Date(promotedAt);
    const expiresAt = new Date(promoted.getTime() + decayWindowHours * 60 * 60 * 1000);
    const diff = expiresAt - now;
    if (diff <= 0) return 'Decay imminent — acknowledge now!';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s remaining to acknowledge`;
  };

  const statusColors = {
    active: { bg: '#e8f5e9', color: '#2d8a4e' },
    waitlisted: { bg: '#fff8e1', color: '#d4a017' },
    hired: { bg: '#e3f2fd', color: '#1a73e8' },
    rejected: { bg: '#fdf0f0', color: '#c0392b' },
    withdrawn: { bg: '#f5f5f5', color: '#888' }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#1a1a2e', margin: 0 }}>Applicant Dashboard</h2>
      </div>

      {error && (
        <div style={{ color: '#c0392b', background: '#fdf0f0', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
          <span onClick={() => setError('')} style={{ float: 'right', cursor: 'pointer' }}>x</span>
        </div>
      )}
      {message && (
        <div style={{ color: '#2d8a4e', background: '#e8f5e9', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {message}
          <span onClick={() => setMessage('')} style={{ float: 'right', cursor: 'pointer' }}>x</span>
        </div>
      )}

      <div style={card}>
        <h3 style={{ fontSize: 15, marginBottom: 12, color: '#1a1a2e' }}>Job Actions</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Enter Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
            style={{ padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, flex: 1, fontSize: 14, color: '#333', outline: 'none' }}
          />
          <button onClick={applyToJob} style={btnPrimary}>Apply</button>
          <button onClick={checkStatus} style={{ ...btnPrimary, background: '#444' }}>Check Status</button>
        </div>
      </div>

      {status && (
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, color: '#1a1a2e', margin: 0 }}>Your Application</h3>
            <button onClick={viewHistory} style={btnSmallGrey}>View Audit Trail</button>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'inline-block',
            padding: '6px 18px',
            borderRadius: 6,
            background: (statusColors[status.status] || statusColors.withdrawn).bg,
            color: (statusColors[status.status] || statusColors.withdrawn).color,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
            marginBottom: 16
          }}>
            {status.status.toUpperCase()}
          </div>

          {/* Waitlisted Info */}
          {status.status === 'waitlisted' && (
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>
                Queue Position: #{status.queue_position}
              </div>
              {status.decay_count > 0 && (
                <p style={{ color: '#c0392b', fontSize: 12, marginTop: 8 }}>
                  You have been decayed {status.decay_count} time(s) — Decay level: {status.decay_level}
                </p>
              )}
            </div>
          )}

          {/* Promotion Pending Acknowledgment */}
          {status.status === 'active' && status.promoted_at && !status.acknowledged_at && (
            <div style={{ marginTop: 12, background: '#fff8e1', padding: 16, borderRadius: 6, border: '1px solid #f0e0a0' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 6 }}>
                You have been promoted to active review!
              </p>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                Promoted at: {new Date(status.promoted_at).toLocaleString()}
              </p>

              {/* Live countdown */}
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#c0392b',
                fontFamily: 'monospace',
                marginBottom: 12,
                background: '#fdf0f0',
                padding: '8px 12px',
                borderRadius: 6,
                display: 'inline-block'
              }}>
                {getDecayCountdown(status.promoted_at, status.decay_window_hours || 48)}
              </div>

              <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 14 }}>
                Failure to acknowledge will push you back in the waitlist at a penalized position.
              </p>
              <button onClick={acknowledge} style={{ ...btnPrimary, background: '#2d8a4e' }}>
                Acknowledge Promotion
              </button>
            </div>
          )}

          {/* Acknowledged */}
          {status.status === 'active' && status.acknowledged_at && (
            <div style={{ marginTop: 12, padding: 12, background: '#e8f5e9', borderRadius: 6 }}>
              <p style={{ color: '#2d8a4e', fontSize: 13, fontWeight: 600 }}>
                Promotion acknowledged — Your application is being actively reviewed
              </p>
            </div>
          )}

          {/* Withdraw */}
          {(status.status === 'active' || status.status === 'waitlisted') && (
            <button onClick={withdraw} style={{ ...btnPrimary, background: '#c0392b', marginTop: 16 }}>
              Withdraw Application
            </button>
          )}

          {/* Audit Trail */}
          {history && (
            <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, color: '#1a1a2e', margin: 0 }}>Audit Trail</h4>
                <span onClick={() => setHistory(null)} style={{ cursor: 'pointer', color: '#888', fontSize: 13 }}>Close</span>
              </div>
              {history.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < history.length - 1 ? '1px solid #f0f0f0' : 'none',
                  fontSize: 13
                }}>
                  <span style={{ color: '#aaa', fontSize: 11, minWidth: 140 }}>{entry.formatted_time}</span>
                  <span style={{ color: '#888' }}>{entry.from_status || 'NEW'}</span>
                  <span style={{ color: '#aaa' }}>→</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{entry.to_status}</span>
                  <span style={{ color: '#7c3aed', fontSize: 11 }}>{entry.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const card = { background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const btnPrimary = { padding: '8px 18px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSmallGrey = { padding: '4px 12px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };