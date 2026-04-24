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
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('role') !== 'company') {
      navigate('/company/login');
      return;
    }
    fetchJobs();
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
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching applications');
    }
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

  const active = applications.filter(a => a.status === 'active');
  const waitlisted = applications.filter(a => a.status === 'waitlisted');
  const exited = applications.filter(a => ['rejected', 'withdrawn', 'hired'].includes(a.status));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#1a1a2e', margin: 0 }}>Company Dashboard</h2>
        <button onClick={() => setShowCreateJob(!showCreateJob)} style={btnPrimary}>+ New Job</button>
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
                  value={jobForm.active_capacity}
                  onChange={e => setJobForm({ ...jobForm, active_capacity: parseInt(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Decay Window (hours)</label>
                <input
                  type="number"
                  min="1"
                  value={jobForm.decay_window_hours}
                  onChange={e => setJobForm({ ...jobForm, decay_window_hours: parseInt(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" style={btnPrimary}>Create Job</button>
              <button type="button" onClick={() => setShowCreateJob(false)} style={{ ...btnPrimary, background: '#888' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
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
              <div style={{ fontSize: 12, color: '#888' }}>
                <span style={{ color: '#2d8a4e' }}>{job.active_count} active</span>
                <span style={{ margin: '0 5px' }}>·</span>
                <span style={{ color: '#d4a017' }}>{job.waitlist_count} waitlisted</span>
                <span style={{ margin: '0 5px' }}>·</span>
                <span>cap: {job.active_capacity}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {!selectedJob && (
            <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
              <p style={{ fontSize: 14 }}>Select a job to view the pipeline</p>
            </div>
          )}

          {selectedJob && (
            <>
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
                          <span style={{ color: '#e67e22', fontSize: 11, marginLeft: 10, fontWeight: 600 }}>
                            PENDING ACK
                          </span>
                        )}
                        {app.acknowledged_at && (
                          <span style={{ color: '#2d8a4e', fontSize: 11, marginLeft: 10 }}>
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleAction(app.id, 'hire')} style={btnSmallGreen}>Hire</button>
                        <button onClick={() => handleAction(app.id, 'reject')} style={btnSmallRed}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 10 }}>
                  <span style={{ background: '#fff8e1', color: '#d4a017', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                    WAITLISTED ({waitlisted.length})
                  </span>
                </h3>
                {waitlisted.length === 0 && <p style={emptyText}>No waitlisted applicants</p>}
                {waitlisted.map((app, i) => (
                  <div key={app.id} style={{ ...card, borderLeft: '3px solid #d4a017', padding: '10px 14px' }}>
                    <span style={{ fontWeight: 700, color: '#d4a017', marginRight: 10, fontSize: 13 }}>#{i + 1}</span>
                    <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{app.applicant_name}</span>
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{app.applicant_email}</span>
                    {app.decay_count > 0 && (
                      <span style={{ color: '#c0392b', fontSize: 11, marginLeft: 10 }}>
                        Decayed {app.decay_count}x (level {app.decay_level})
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {exited.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: 10 }}>
                    <span style={{ background: '#f5f5f5', color: '#888', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                      EXITED ({exited.length})
                    </span>
                  </h3>
                  {exited.map(app => (
                    <div key={app.id} style={{ ...card, borderLeft: '3px solid #ddd', padding: '10px 14px', opacity: 0.6 }}>
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
const inputStyle = { display: 'block', width: '100%', padding: '9px 12px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', fontSize: 14, color: '#333', outline: 'none' };
const labelStyle = { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' };
const btnPrimary = { padding: '8px 18px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSmallGreen = { padding: '4px 12px', background: '#2d8a4e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const btnSmallRed = { padding: '4px 12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const emptyText = { color: '#bbb', fontSize: 13, padding: '6px 0' };