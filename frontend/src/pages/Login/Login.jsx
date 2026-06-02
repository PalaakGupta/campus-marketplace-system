import React, { useState } from 'react';
import './Login.css';

const LoginForm = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' }); 

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    // 1. Validation Cause: Empty fields
    if (!loginId || !password) {
      setStatus({ type: 'error', message: 'Login failed: All fields are required.' });
      return;
    }

    // 3. Validation Cause: Password strength
    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Login failed: Password must be at least 6 characters long.' });
      return;
    }

    // Simulated Success 
    setStatus({ 
      type: 'success', 
      message: 'Login Successful! Welcome to the Campus Marketplace. Redirecting...' 
    });
  };

  return (
    <div className="login-wrapper">
      {/* Dynamic class assigns standard, success (green), or error (red) shadows */}
      <div className={`login-container ${status.type}`}>
        <div className="marketplace-logo">🎓</div>
        <h2>Campus Secure Marketplace</h2>
        <p className="subtitle">Buy & Sell with verified students and staff</p>

        {/* Custom Window Messages instead of alerts */}
        {status.message && (
          <div className={`window-message ${status.type}-message`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="loginId">Login Id</label>
            <input 
              type="text" 
              id="loginId" 
              placeholder=""
              value={loginId} 
              onChange={(e) => setLoginId(e.target.value)} 
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder=""
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className="login-button">Sign In</button>
        </form>

        <div className="form-footer">
          <a href="#forgot">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
