import React, { useEffect, useState } from "react";
import { getToken } from "../core/auth";
import "../pages/styles/ExchangeRatesModal.css";

const ExchangeRatesModal = ({ show, onClose, role }) => {
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && role === "SH") {
      fetchExchangeRates();
    }
  }, [show, role]);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://172.28.77.151:8081/dashboard/currency-rates`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const result = await response.json();
      const formatted = {};
      result.forEach(rate => {
        formatted[rate.currency_code] = rate.rate_to_usd;
      });
      setExchangeRates(formatted);
    } catch (error) {
      console.error("Failed to fetch currency rates", error);
    }
    setLoading(false);
  };

  const handleInputChange = (currency, value) => {
    setExchangeRates(prev => ({
      ...prev,
      [currency]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      rates: Object.entries(exchangeRates).map(([currency_code, rate_to_usd]) => ({
        currency_code,
        rate_to_usd: parseFloat(rate_to_usd),
      })),
    };

    try {
      const response = await fetch(`http://localhost:8000/dashboard/currency-rates`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update currency rates");
      alert("Exchange rates updated successfully");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error updating currency rates");
    }
    setSaving(false);
  };

  if (!show || role !== "SH") return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Update Exchange Rates</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="rate-inputs">
            {Object.entries(exchangeRates).map(([currency, rate]) => (
              <div key={currency} className="rate-row">
                <label>{currency}</label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => handleInputChange(currency, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn cancel">Cancel</button>
          <button onClick={handleSave} className="btn save" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesModal;