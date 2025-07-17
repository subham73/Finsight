import React from "react";
import "../pages/styles/Footer.css";

const Footer = () => {
    return (
        <footer className="footer">
            <p>&copy; {new Date().getFullYear()} Finance Forecast. All rights reserved.</p>
        </footer>
    );
};

export default Footer;
