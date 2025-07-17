import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { logout } from "../core/auth";
import TTL_LOGO from "../assets/ttl-logo.png";
import Navbar from "./Navbar";
import "../pages/styles/Header.css";

const Header = () => {
  const [userInfo, setUserInfo] = useState({ name: "", role: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          name: decoded.name || "Unknown",
          role: decoded.role || "Unknown"
        });
      } catch (err) {
        console.error("Token decode error:", err);
      }
    }
  }, []);

  return (
    <header className="header">
      <div className="logo">
        <h3>FinSight</h3>
        <img src={TTL_LOGO} alt="" width={150} height={12} />
      </div>
      <Navbar />
      <div className="user-info-container">
        <div className="user-details">
          <strong>{userInfo.name}</strong>
          <small className="role-text">{userInfo.role}</small>
        </div>
        <span role="img" aria-label="user" className="user-icon">👤</span>
        <button onClick={logout} className="logout-button">Logout</button>
      </div>
    </header>
  );
};

export default Header;