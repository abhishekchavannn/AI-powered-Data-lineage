import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// This will be used as our template CSV content
const templateCsvContent = `source_system,source_dataset,source_attribute,transformation_type,transformation_logic,target_system,target_dataset,target_attribute,metadata`;

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8083/api/lineage/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage("File uploaded successfully!");
      setTimeout(() => {
        navigate("/visualization");
      }, 2000);
    } catch (error) {
      setMessage(
        "Error uploading file: " + (error.response?.data || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a Blob containing the CSV data
    const blob = new Blob([templateCsvContent], { type: "text/csv" });
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = "lineage_template.csv";
    // Append, click and remove the anchor
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Release the URL object
    URL.revokeObjectURL(url);
  };

  return (
    <div className="upload-container">
      <h2>Upload Lineage CSV File</h2>

      <div className="csv-template">
        <h3>CSV Template Format</h3>
        <pre>
          source_system,source_dataset,source_attribute,transformation_type,transformation_logic,target_system,target_dataset,target_attribute,metadata
        </pre>
        <p>Example:</p>
        <pre>
          MySQL_Prod,customers,first_name,CONCAT,"CONCAT(first_name, ' ',
          last_name)",DataWarehouse,dim_customer,full_name,created:2023-01-01
        </pre>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>

        {message && <div className="message">{message}</div>}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="download-template-btn"
          >
            Download Template
          </button>
        </div>
      </form>
    </div>
  );
};

export default FileUpload;
