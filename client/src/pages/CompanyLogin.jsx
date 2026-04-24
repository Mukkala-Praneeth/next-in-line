import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function CompanyLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/companies/register' : '/companies/login';
      const body = isRegister ? form : { email: form.email, password: form.password };
      const res = await API.post(endpoint, body);
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', 'company');
      navigate('/company/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{
      maxWidth: 380,
      margin: '60px auto',
      background: 'white',
      padding: 32,
      borderRadius: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ marginBottom: 6, fontSize: 22, color: '#1a1a2e' }}>
        {isRegister ? 'Register Company' : 'Company Login'}
      </h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        {isRegister ? 'Create your company account' : 'Sign in to manage your hiring pipeline'}
      </p>

      {error && <p style={{ color: '#c0392b', fontSize: 13, background: '#fdf0f0', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            placeholder="Company Name"
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
        <button type="submit" style={btnStyle}>
          {isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p
        style={{ marginTop: 18, cursor: 'pointer', color: '#4a90d9', fontSize: 13, textAlign: 'center' }}
        onClick={() => setIsRegister(!isRegister)}
      >
        {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
      </p>
    </div>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: 12,
  border: '1px solid #ddd',
  borderRadius: 6,
  boxSizing: 'border-box',
  fontSize: 14,
  color: '#333',
  outline: 'none'
};

const btnStyle = {
  width: '100%',
  padding: '11px',
  background: '#1a1a2e',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 600,
  marginTop: 4
};