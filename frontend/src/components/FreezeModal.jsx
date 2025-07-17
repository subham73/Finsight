// components/FreezeModal.jsx
import React from "react";
import "../pages/styles/FreezeModal.css";

const FreezeModal = ({ freezeStart, freezeEnd, setFreezeStart, setFreezeEnd, onClose }) => {
  return (
    <div className="freeze-modal-overlay">
      <div className="freeze-modal">
        <h2>Set Forecast Action Window</h2>
        
        <div className="input-row">
          <div className="input-group">
            <label>Start Day:</label>
            <input
              type="number"
              min="1"
              max="31"
              value={freezeStart}
              onChange={(e) => {setFreezeStart(Number(e.target.value)),localStorage.setItem("freezeStart", freezeStart);}
                }
            />
          </div>
          <div className="input-group">
            <label>End Day:</label>
            <input
              type="number"
              min="1"
              max="31"
              value={freezeEnd}
              onChange={(e) => {setFreezeEnd(Number(e.target.value)),
                localStorage.setItem("freezeEnd", freezeEnd);}}
            />
          </div>
        </div>

        <div className="button-row">
          <button className="btn-primary" onClick={onClose}>Save</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FreezeModal;
