import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const templateCsvContent = `source_system,source_dataset,source_attribute,transformation_type,transformation_logic,target_system,target_dataset,target_attribute,metadata`;

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setMessage("");
    } else {
      setMessage("Please drop a CSV file");
    }
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
      await axios.post(
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
    const blob = new Blob([templateCsvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lineage_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Upload Lineage Data</h2>
        <p className="text-muted-foreground">Import your CSV file to visualize data lineage</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 shadow-xl">
          <h3 className="text-lg font-semibold mb-5 flex items-center tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            CSV Template Format
          </h3>
          
          <div className="space-y-5">
            <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-5 overflow-x-auto border border-border/30 shadow-sm">
              <pre className="text-xs text-muted-foreground font-medium leading-relaxed">
                source_system,source_dataset,source_attribute,transformation_type,
                transformation_logic,target_system,target_dataset,target_attribute,metadata
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-foreground">Example:</p>
              <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-5 overflow-x-auto border border-border/30 shadow-sm">
                <pre className="text-xs text-primary font-medium leading-relaxed">
                  MySQL_Prod,customers,first_name,CONCAT,"CONCAT(first_name, ' ', last_name)",
                  DataWarehouse,dim_customer,full_name,created:2023-01-01
                </pre>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center px-5 py-2.5 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className={`rounded-2xl border-2 border-dashed transition-all duration-300 ${
              isDragOver
                ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl'
                : 'border-border/50 bg-card/60 backdrop-blur-sm'
            } p-12 shadow-lg`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div className="text-center">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary font-semibold hover:underline">Click to upload</span>
                  <span className="text-muted-foreground font-medium"> or drag and drop</span>
                </label>
                <p className="text-sm text-muted-foreground mt-2 font-medium">CSV files only</p>
              </div>

              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {file && (
                <div className="flex items-center space-x-3 px-5 py-3 rounded-xl bg-primary/10 backdrop-blur-sm text-primary border border-primary/30 shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div
              className={`rounded-2xl p-5 backdrop-blur-sm shadow-lg ${
                message.includes('Error')
                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                  : 'bg-primary/10 text-primary border border-primary/30'
              }`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  message.includes('Error') ? 'bg-destructive/20' : 'bg-primary/20'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {message.includes('Error') ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <span className="text-sm font-semibold">{message}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <div className="relative w-5 h-5 mr-3">
                  <div className="absolute inset-0 rounded-full border-2 border-primary-foreground/30"></div>
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-foreground"></div>
                </div>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FileUpload;
