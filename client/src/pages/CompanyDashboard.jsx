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
    } catch (err) {
      setError(err.response?.data?.message || `Error: ${action}`);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/company/login');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Company Dashboard</h2>
        <div>
          <button onClick={() => setShowCreateJob(!showCreateJob)} style={btnPrimary}>+ Create Job</button>
          <button onClick={logout} style={{ ...btnPrimary, background: '#666', marginLeft: 10 }}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red', background: '#ffe0e0', padding: 10, borderRadius: 4 }}>{error}</p>}

      {showCreateJob && (
        <div style={card}>
          <h3>Create New Job</h3>
          <form onSubmit={createJob}>
            <input placeholder="Job Title" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} style={inputStyle} />
            <textarea placeholder="Description" value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} style={{ ...inputStyle, height: 80 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="number" placeholder="Active Capacity" value={jobForm.active_capacity} onChange={e => setJobForm({ ...jobForm, active_capacity: parseInt(e.target.value) })} style={inputStyle} />
              <input type="number" placeholder="Decay Window (hrs)" value={jobForm.decay_window_hours} onChange={e => setJobForm({ ...jobForm, decay_window_hours: parseInt(e.target.value) })} style={inputStyle} />
            </div>
            <button type="submit" style={btnPrimary}>Create</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>Your Jobs</h3>
          {jobs.length === 0 && <p style={{ color: '#888' }}>No jobs yet. Create one!</p>}
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => fetchApplications(job.id)}
              style={{
                ...card,
                cursor: 'pointer',
                border: selectedJob === job.id ? '2px solid #1a1a2e' : '2px solid transparent'
              }}
            >
              <h4 style={{ margin: '0 0 5px' }}>{job.title}</h4>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                Capacity: {job.active_count}/{job.active_capacity} active | {job.waitlist_count} waitlisted
              </p>
            </div>
          ))}
        </div>

        <div style={{ flex: 2 }}>
          {selectedJob && (
            <>
              <h3>Pipeline</h3>

              <h4 style={{ color: '#2d8a4e' }}>Active</h4>
              {applications.filter(a => a.status === 'active').map(app => (
                <div key={app.id} style={{ ...card, borderLeft: '4px solid #2d8a4e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{app.applicant_name}</strong> — {app.applicant_email}
                      {app.promoted_at && !app.acknowledged_at && (
                        <span style={{ color: 'orange', marginLeft: 10, fontSize: 12 }}>⏳ Awaiting acknowledgment</span>
                      )}
                      {app.acknowledged_at && (
                        <span style={{ color: 'green', marginLeft: 10, fontSize: 12 }}>✅ Acknowledged</span>
                      )}
                    </div>
                    <div>
                      <button onClick={() => handleAction(app.id, 'hire')} style={btnSmallGreen}>Hire</button>
                      <button onClick={() => handleAction(app.id, 'reject')} style={btnSmallRed}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}

              <h4 style={{ color: '#d4a017' }}>Waitlisted</h4>
              {applications.filter(a => a.status === 'waitlisted').map((app, i) => (
                <div key={app.id} style={{ ...card, borderLeft: '4px solid #d4a017' }}>
                  <strong>#{i + 1}</strong> — {app.applicant_name} — {app.applicant_email}
                  {app.decay_count > 0 && (
                    <span style={{ color: 'red', marginLeft: 10, fontSize: 12 }}>
                      Decayed {app.decay_count}x (level {app.decay_level})
                    </span>
                  )}
                </div>
              ))}

              <h4 style={{ color: '#888' }}>Exited</h4>
              {applications.filter(a => ['rejected', 'withdrawn', 'hired'].includes(a.status)).map(app => (
                <div key={app.id} style={{ ...card, borderLeft: '4px solid #ccc', opacity: 0.6 }}>
                  {app.applicant_name} — <em>{app.status}</em>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const card = { background: 'white', padding: 15, borderRadius: 8, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' };
const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 10, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' };
const btnPrimary = { padding: '10px 20px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };
const btnSmallGreen = { padding: '5px 12px', background: '#2d8a4e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 5, fontSize: 12 };
const btnSmallRed = { padding: '5px 12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 };