"use client";

import { useState, useRef } from "react";

const API_URL = "https://api-ochre-rho-50.vercel.app";

type StatusType = "idle" | "loading" | "success" | "error";

interface ApiResult {
  status: StatusType;
  message: string;
  data?: string;
}

export default function Home() {
  const [healthResult, setHealthResult] = useState<ApiResult>({
    status: "idle",
    message: "",
  });
  const [randomResult, setRandomResult] = useState<ApiResult>({
    status: "idle",
    message: "",
  });
  const [uploadResult, setUploadResult] = useState<ApiResult>({
    status: "idle",
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkHealth = async () => {
    setHealthResult({ status: "loading", message: "Checking..." });
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setHealthResult({
        status: "success",
        message: "API is healthy",
        data: JSON.stringify(data, null, 2),
      });
    } catch {
      setHealthResult({
        status: "error",
        message: "Failed to connect to API",
      });
    }
  };

  const checkRandomEndpoint = async () => {
    setRandomResult({ status: "loading", message: "Checking..." });
    try {
      const response = await fetch(`${API_URL}/random-endpoint-that-does-not-exist`);
      if (!response.ok) {
        const data = await response.json();
        setRandomResult({
          status: "error",
          message: `Expected error: ${response.status}`,
          data: JSON.stringify(data, null, 2),
        });
      } else {
        setRandomResult({
          status: "success",
          message: "Unexpected success",
        });
      }
    } catch {
      setRandomResult({
        status: "error",
        message: "Failed to connect to API",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult({ status: "idle", message: "" });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploadResult({ status: "loading", message: "Analyzing..." });

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/file-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setUploadResult({
          status: "success",
          message: `Frame count: ${data.frameCount}`,
          data: JSON.stringify(data, null, 2),
        });
      } else {
        setUploadResult({
          status: "error",
          message: data.error || "Upload failed",
          data: JSON.stringify(data, null, 2),
        });
      }
    } catch {
      setUploadResult({
        status: "error",
        message: "Failed to upload file",
      });
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case "success":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "loading":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] font-[family-name:var(--font-inter)]">
      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-16">
          <h1 className="text-3xl font-extralight tracking-tight mb-2">
            MP3 Frame Analyzer
          </h1>
          <p className="text-[var(--gray-500)] font-light">
            Analyze MP3 files and count audio frames
          </p>
        </header>

        {/* API Tests Section */}
        <section className="mb-12">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--gray-500)] mb-6">
            API Status
          </h2>

          <div className="space-y-4">
            {/* Health Check */}
            <div className="border border-[var(--gray-200)] dark:border-[var(--gray-200)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Health Check</h3>
                  <p className="text-sm text-[var(--gray-500)]">/health</p>
                </div>
                <button
                  onClick={checkHealth}
                  disabled={healthResult.status === "loading"}
                  className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-md text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {healthResult.status === "loading" ? "..." : "Check"}
                </button>
              </div>
              {healthResult.message && (
                <div className={`text-sm ${getStatusColor(healthResult.status)}`}>
                  {healthResult.message}
                  {healthResult.data && (
                    <pre className="mt-2 p-2 bg-[var(--gray-100)] rounded text-xs font-[family-name:var(--font-mono)] overflow-x-auto">
                      {healthResult.data}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Random Endpoint */}
            <div className="border border-[var(--gray-200)] dark:border-[var(--gray-200)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Random Endpoint</h3>
                  <p className="text-sm text-[var(--gray-500)]">/random-endpoint (404 expected)</p>
                </div>
                <button
                  onClick={checkRandomEndpoint}
                  disabled={randomResult.status === "loading"}
                  className="px-4 py-2 border border-[var(--gray-300)] rounded-md text-sm font-medium hover:bg-[var(--gray-100)] transition-colors disabled:opacity-50"
                >
                  {randomResult.status === "loading" ? "..." : "Test"}
                </button>
              </div>
              {randomResult.message && (
                <div className={`text-sm ${getStatusColor(randomResult.status)}`}>
                  {randomResult.message}
                  {randomResult.data && (
                    <pre className="mt-2 p-2 bg-[var(--gray-100)] rounded text-xs font-[family-name:var(--font-mono)] overflow-x-auto">
                      {randomResult.data}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* File Upload Section */}
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--gray-500)] mb-6">
            Analyze MP3
          </h2>

          <div className="border border-[var(--gray-200)] dark:border-[var(--gray-200)] rounded-lg p-6">
            {/* File Selection */}
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp3,audio/mpeg"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-[var(--gray-300)] rounded-lg hover:border-[var(--gray-400)] transition-colors"
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-8 w-8 text-[var(--gray-400)] mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <p className="text-sm text-[var(--gray-500)]">
                    {selectedFile ? selectedFile.name : "Click to select an MP3 file"}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-[var(--gray-400)] mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </button>
            </div>

            {/* Upload Button */}
            <button
              onClick={uploadFile}
              disabled={!selectedFile || uploadResult.status === "loading"}
              className="w-full py-3 bg-[var(--foreground)] text-[var(--background)] rounded-md font-medium hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {uploadResult.status === "loading" ? "Analyzing..." : "Analyze File"}
            </button>

            {/* Result */}
            {uploadResult.message && (
              <div className={`mt-4 text-center ${getStatusColor(uploadResult.status)}`}>
                <p className="text-lg font-medium">{uploadResult.message}</p>
                {uploadResult.data && (
                  <pre className="mt-2 p-3 bg-[var(--gray-100)] rounded text-xs font-[family-name:var(--font-mono)] text-left overflow-x-auto">
                    {uploadResult.data}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--gray-200)]">
          <p className="text-sm text-[var(--gray-500)] text-center">
            API: <a href={API_URL} className="underline hover:text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">{API_URL}</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
