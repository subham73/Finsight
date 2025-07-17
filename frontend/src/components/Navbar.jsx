import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import "../pages/styles/Navbar.css";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li className={location.pathname === "/dashboard" ? "active" : ""}>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        <li className={location.pathname === "/forecasts" ? "active" : ""}>
          <Link to="/forecast">Forecast</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;