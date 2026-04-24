import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function CompanyDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', description: '', active_capacity: 3, decay_window_hours: 48 });
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);
  const [historyAppId, setHistoryAppId] = useState(null);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'company') {
      navigate('/company/login');
      return;
    }
    fetchJobs();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await API.get('/jobs');
      setJobs(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/company/login');
    }
  };

  const fetchApplications = async (jobId) => {
    try {
      const res = await API.get(`/applications/jobs/${jobId}`);
      setApplications(res.data.data);
      setSelectedJob(jobId);
      setHistory(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching applications');
    }
  };

  const refresh = () => {
    fetchJobs();
    if (selectedJob) fetchApplications(selectedJob);
  };

  const createJob = async (e) => {
    e.preventDefault();
    try {
      await API.post('/jobs', jobForm);
      setShowCreateJob(false);
      setJobForm({ title: '', description: '', active_capacity: 3, decay_window_hours: 48 });
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating job');
    }
  };

  const handleAction = async (appId, action) => {
    try {
      await API.post(`/applications/${appId}/${action}`);
      fetchApplications(selectedJob);
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.message || `Error: ${action}`);
    }
  };

  const viewHistory = async (appId) => {
    try {
      const res = await API.get(`/applications/${appId}/history`);
      setHistory(res.data.data.history);
      setHistoryAppId(appId);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching history');
    }
  };

  const getDecayCountdown = (promotedAt, decayWindowHours) => {
    if (!promotedAt) return null;
    const promoted = new Date(promotedAt);
    const expiresAt = new Date(promoted.getTime() + decayWindowHours * 60 * 60 * 1000);
    const diff = expiresAt - now;
    if (diff <= 0) return 'Decaying soon...';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s remaining`;
  };

  const selectedJobData = jobs.find(j => j.id === selectedJob);
  const active = applications.filter(a => a.status === 'active');
  const waitlisted = applications.filter(a => a.status === 'waitlisted');
  const exited = applications.filter(a => ['rejected', 'withdrawn', 'hired'].includes(a.status));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#1a1a2e', margin: 0 }}>Company Dashboard</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={refresh} style={btnSecondary}>Refresh</button>
          <button onClick={() => setShowCreateJob(!showCreateJob)} style={btnPrimary}>+ New Job</button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#c0392b', background: '#fdf0f0', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
          <span onClick={() => setError('')} style={{ float: 'right', cursor: 'pointer' }}>x</span>
        </div>
      )}

      {showCreateJob && (
        <div style={card}>
          <h3 style={{ fontSize: 16, marginBottom: 14, color: '#1a1a2e' }}>Create New Job Opening</h3>
          <form onSubmit={createJob}>
            <input
              placeholder="Job Title"
              value={jobForm.title}
              onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
              style={inputStyle}
            />
            <textarea
              placeholder="Job Description"
              value={jobForm.description}
              onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
              style={{ ...inputStyle, height: 70, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Active Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={jobForm.active_capacity}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 99) {
                      setJobForm({ ...jobForm, active_capacity: val });
                    }
                  }}
                  style={inputStyle}
                />
                <span style={{ fontSize: 11, color: '#aaa' }}>1 to 99 slots</span>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Decay Window (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={jobForm.decay_window_hours}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 99) {
                      setJobForm({ ...jobForm, decay_window_hours: val });
                    }
                  }}
                  style={inputStyle}
                />
                <span style={{ fontSize: 11, color: '#aaa' }}>1 to 99 hours</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={btnPrimary}>Create Job</button>
              <button type="button" onClick={() => setShowCreateJob(false)} style={{ ...btnPrimary, background: '#888' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Jobs List */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <h3 style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Your Jobs</h3>
          {jobs.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>No jobs created yet</p>}
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => fetchApplications(job.id)}
              style={{
                ...card,
                cursor: 'pointer',
                borderLeft: selectedJob === job.id ? '3px solid #1a1a2e' : '3px solid transparent',
                padding: '12px 14px'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>{job.title}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                Job ID: <strong style={{ color: '#555' }}>{job.id}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>
                <span style={{ color: '#2d8a4e' }}>{job.active_count} active</span>
                <span style={{ margin: '0 5px' }}>·</span>
                <span style={{ color: '#d4a017' }}>{job.waitlist_count} waitlisted</span>
                <span style={{ margin: '0 5px' }}>·</span>
                <span>cap: {job.active_capacity}</span>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                Decay window: {job.decay_window_hours}h
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline View */}
        <div style={{ flex: 1 }}>
          {!selectedJob && (
            <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
              <p style={{ fontSize: 14 }}>Select a job to view the pipeline</p>
            </div>
          )}

          {selectedJob && (
            <>
              {/* Active */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 10 }}>
                  <span style={{ background: '#e8f5e9', color: '#2d8a4e', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                    ACTIVE ({active.length})
                  </span>
                </h3>
                {active.length === 0 && <p style={emptyText}>No active applicants</p>}
                {active.map(app => (
                  <div key={app.id} style={{ ...card, borderLeft: '3px solid #2d8a4e', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{app.applicant_name}</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{app.applicant_email}</span>
                        {app.promoted_at && !app.acknowledged_at && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ color: '#e67e22', fontSize: 11, fontWeight: 600 }}>PENDING ACK</span>
                            <span style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: '#c0392b',
                              fontWeight: 700,
                              fontFamily: 'monospace'
                            }}>
                              {getDecayCountdown(app.promoted_at, selectedJobData?.decay_window_hours || 48)}
                            </span>
                          </div>
                        )}
                        {app.acknowledged_at && (
                          <span style={{ color: '#2d8a4e', fontSize: 11, marginLeft: 10 }}>Acknowledged</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => viewHistory(app.id)} style={btnSmallGrey}>History</button>
                        <button onClick={() => handleAction(app.id, 'hire')} style={btnSmallGreen}>Hire</button>
                        <button onClick={() => handleAction(app.id, 'reject')} style={btnSmallRed}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Waitlisted */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 10 }}>
                  <span style={{ background: '#fff8e1', color: '#d4a017', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                    WAITLISTED ({waitlisted.length})
                  </span>
                </h3>
                {waitlisted.length === 0 && <p style={emptyText}>No waitlisted applicants</p>}
                {waitlisted.map((app, i) => (
                  <div key={app.id} style={{ ...card, borderLeft: '3px solid #d4a017', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#d4a017', marginRight: 10, fontSize: 13 }}>#{i + 1}</span>
                        <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{app.applicant_name}</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{app.applicant_email}</span>
                        {app.decay_count > 0 && (
                          <span style={{ color: '#c0392b', fontSize: 11, marginLeft: 10 }}>
                            Decayed {app.decay_count}x (level {app.decay_level})
                          </span>
                        )}
                      </div>
                      <button onClick={() => viewHistory(app.id)} style={btnSmallGrey}>History</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exited */}
              {exited.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 10 }}>
                    <span style={{ background: '#f5f5f5', color: '#888', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                      EXITED ({exited.length})
                    </span>
                  </h3>
                  {exited.map(app => (
                    <div key={app.id} style={{ ...card, borderLeft: '3px solid #ddd', padding: '10px 14px', opacity: 0.6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#555' }}>{app.applicant_name}</span>
                          <span style={{
                            marginLeft: 10,
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: app.status === 'hired' ? '#e8f5e9' : '#fdf0f0',
                            color: app.status === 'hired' ? '#2d8a4e' : '#c0392b'
                          }}>
                            {app.status.toUpperCase()}
                          </span>
                        </div>
                        <button onClick={() => viewHistory(app.id)} style={btnSmallGrey}>History</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History Panel */}
              {history && (
                <div style={{ ...card, marginTop: 10, borderLeft: '3px solid #7c3aed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, color: '#1a1a2e', margin: 0 }}>
                      Audit Trail — Application #{historyAppId}
                    </h3>
                    <span onClick={() => setHistory(null)} style={{ cursor: 'pointer', color: '#888', fontSize: 13 }}>Close</span>
                  </div>
                  {history.map((entry, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: i < history.length - 1 ? '1px solid #f0f0f0' : 'none',
                      fontSize: 13,
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ color: '#aaa', fontSize: 11, minWidth: 140 }}>{entry.formatted_time}</span>
                      <span style={{ color: '#888' }}>{entry.from_status || 'NEW'}</span>
                      <span style={{ color: '#aaa' }}>→</span>
                      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{entry.to_status}</span>
                      <span style={{ color: '#7c3aed', fontSize: 11 }}>{entry.reason}</span>
                      {entry.metadata && (
                        <span style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace' }}>
                          {JSON.stringify(entry.metadata)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const card = { background: 'white', padding: 16, borderRadius: 8, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const inputStyle = { display: 'block', width: '100%', padding: '9px 12px', marginBottom: 6, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', fontSize: 14, color: '#333', outline: 'none' };
const labelStyle = { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' };
const btnPrimary = { padding: '8px 18px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary = { padding: '8px 18px', background: 'white', color: '#1a1a2e', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSmallGreen = { padding: '4px 12px', background: '#2d8a4e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnSmallRed = { padding: '4px 12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnSmallGrey = { padding: '4px 12px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const emptyText = { color: '#bbb', fontSize: 13, padding: '6px 0' };