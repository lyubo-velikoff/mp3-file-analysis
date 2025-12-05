"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "loading":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="relative z-10 min-h-screen text-black dark:text-white">
      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-extralight tracking-tight mb-3">
            MP3 Frame Analyzer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-light">
            Analyze MP3 files and count audio frames
          </p>
        </header>

        {/* API Tests Section */}
        <section className="mb-12">
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6">
            API Status
          </h2>

          <div className="space-y-4">
            {/* Health Check */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Health Check</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">/health</p>
                </div>
                <button
                  onClick={checkHealth}
                  disabled={healthResult.status === "loading"}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {healthResult.status === "loading" ? "..." : "Check"}
                </button>
              </div>
              {healthResult.message && (
                <div className={`text-sm ${getStatusColor(healthResult.status)}`}>
                  {healthResult.message}
                  {healthResult.data && (
                    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto text-gray-800 dark:text-gray-200">
                      {healthResult.data}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Random Endpoint */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Random Endpoint</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">/random-endpoint (404 expected)</p>
                </div>
                <button
                  onClick={checkRandomEndpoint}
                  disabled={randomResult.status === "loading"}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {randomResult.status === "loading" ? "..." : "Test"}
                </button>
              </div>
              {randomResult.message && (
                <div className={`text-sm ${getStatusColor(randomResult.status)}`}>
                  {randomResult.message}
                  {randomResult.data && (
                    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto text-gray-800 dark:text-gray-200">
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
          <h2 className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6">
            Analyze MP3
          </h2>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            {/* File Selection */}
            <div className="mb-5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp3,audio/mpeg"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-gray-400 mb-3"
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : "Click to select an MP3 file"}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {uploadResult.status === "loading" ? "Analyzing..." : "Analyze File"}
            </button>

            {/* Result */}
            {uploadResult.message && (
              <div className={`mt-5 text-center ${getStatusColor(uploadResult.status)}`}>
                <p className="text-xl font-medium">{uploadResult.message}</p>
                {uploadResult.data && (
                  <pre className="mt-3 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-left overflow-x-auto text-gray-800 dark:text-gray-200">
                    {uploadResult.data}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center font-mono">
            API:{" "}
            <a
              href={API_URL}
              className="underline hover:text-black dark:hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {API_URL}
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
