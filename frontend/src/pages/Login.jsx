import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import login_img from "../assets/New_healthy_working_system.webp";
import { jwtDecode } from 'jwt-decode';
import './styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  // Handle SSO token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      const decoded = jwtDecode(token);
      localStorage.setItem("userRole", decoded.role);
      setStatus("SSO login successful");
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://172.28.77.151:8081/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.detail || "Login failed");
    } else {
      localStorage.setItem("token", data.access_token);
      const decoded = jwtDecode(data.access_token);
      localStorage.setItem("userRole", decoded.role);
      setStatus("Login successful");
      navigate("/dashboard");
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <img src={login_img} alt="Login Illustration" />
      </div>
      <div className="login-right">
        <h2>Welcome Back</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>

        <div className="separator">
          <span className="line"></span>
          <a
            href="http://172.28.77.151:8081/sso/login"
            className="sso"
            style={{ textDecoration: "none", color: "#007bff" }}
          >
            or sign in with SSO
          </a>
          <span className="line"></span>
        </div>

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
};

export default Login;
