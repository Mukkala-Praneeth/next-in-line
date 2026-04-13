import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function ApplicantLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/applicants/register' : '/applicants/login';
      const body = isRegister ? form : { email: form.email, password: form.password };
      const res = await API.post(endpoint, body);
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', 'applicant');
      navigate('/applicant/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto', background: 'white', padding: 30, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h2>{isRegister ? 'Register as Applicant' : 'Applicant Login'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
        )}
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          style={inputStyle}
        />
        <button type="submit" style={btnStyle}>{isRegister ? 'Register' : 'Login'}</button>
      </form>
      <p style={{ marginTop: 15, cursor: 'pointer', color: '#4a90d9' }} onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Already have an account? Login' : 'No account? Register'}
      </p>
    </div>
  );
}

const inputStyle = { display: 'block', width: '100%', padding: '10px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' };
const btnStyle = { width: '100%', padding: '10px', background: '#16213e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 };