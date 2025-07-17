import React, { useState } from "react";
import { getToken, isTokenExpired } from "../core/auth";
import { toast } from "react-toastify";
import "../pages/styles/ActualsImportModal.css";

const MAX_FILE_SIZE_MB = 5;

const ActualsImportModal = ({ onClose, opId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [uploadFailed, setUploadFailed] = useState(false);

  const validateFile = (file) => {
    if (!file.name.endsWith(".xlsx")) {
      toast.error("Only .xlsx files are allowed.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be under ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadFailed(false);
      setResponseData(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadFailed(false);
      setResponseData(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning("Please select a file first.");
      return;
    }

    setIsUploading(true);
    toast.info("Uploading actuals, please wait...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const token = getToken();
      const response = await fetch(
        `http://172.28.77.151:8081/dashboard/import-actuals`,
        { 
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(`✅ ${result.message}`);
        setResponseData(result);
        setUploadFailed(false);
        onClose();
      } else {
        toast.error(`❌ Upload failed: ${result.detail || "Unknown error"}`);
        setUploadFailed(true);
      }
    } catch (error) {
      toast.error(`❌ Network error: ${error.message}`);
      setUploadFailed(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <p>Drag & drop your .xlsx file here, or click to select</p>
          <input type="file" accept=".xlsx" onChange={handleFileChange} />
        </div>

        {selectedFile && <p>Selected file: {selectedFile.name}</p>}

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : uploadFailed ? "Retry Upload" : "Upload"}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>

        {responseData && (
          <div className="upload-summary">
            <p><strong>Projects Updated</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActualsImportModal;
