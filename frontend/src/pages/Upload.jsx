import { useState, useRef } from "react";
import ImageResult from "../components/ImageResult";

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const inputRef = useRef();

  const addLog = (msg) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError("Invalid file type. Upload a JPG, PNG, or WEBP image.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    addLog(`File selected: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setLog([]);
    addLog("Initialising vision analysis...");
    addLog(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      addLog("Sending to /vision/analyse...");
      const res = await fetch("http://localhost:8000/vision/analyse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      addLog(`Analysis complete. ${data.items?.length ?? 0} item types detected.`);
      setResult(data);
    } catch (err) {
      addLog("Backend unavailable — using mock data.");
      const mock = {
        filename: file.name,
        annotated_image_url: null,
        items: [
          { item: "Red Bull", count: 24, confidence: 0.87 },
          { item: "Coca-Cola", count: 48, confidence: 0.91 },
          { item: "Heineken", count: 12, confidence: 0.76 },
        ],
        source: "mock",
      };
      setResult(mock);
      addLog("Loaded mock vision results.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setLog([]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border border-dark-500 bg-dark-700 p-6">
        <p className="text-terminal-blue text-xs font-mono uppercase tracking-widest mb-1">
          VISION ANALYSIS MODULE
        </p>
        <h1 className="text-white text-2xl font-mono font-bold tracking-tight">
          Upload Inventory Image
        </h1>
        <p className="text-slate-500 text-xs font-mono mt-1">
          Upload a shelf or warehouse photo to detect item counts via computer vision.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload area */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-terminal-green bg-terminal-green/5"
                : file
                ? "border-terminal-blue/50 bg-terminal-blue/5"
                : "border-dark-400 hover:border-dark-300"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div className="text-terminal-blue text-3xl mb-2">◫</div>
                <p className="text-terminal-blue font-mono text-sm font-medium">{file.name}</p>
                <p className="text-slate-500 font-mono text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <div className="text-dark-400 text-4xl mb-3">⊕</div>
                <p className="text-slate-400 font-mono text-sm">Drop image here or click to browse</p>
                <p className="text-slate-600 font-mono text-xs mt-1">JPG, PNG, WEBP</p>
              </div>
            )}
          </div>

          {error && (
            <div className="border border-terminal-red/30 bg-terminal-red/5 px-4 py-3">
              <p className="text-terminal-red text-xs font-mono">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="flex-1 bg-terminal-green/10 hover:bg-terminal-green/20 border border-terminal-green/50 text-terminal-green px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-30"
            >
              {loading ? "ANALYSING..." : "▶ ANALYSE IMAGE"}
            </button>
            {(file || result) && (
              <button
                onClick={reset}
                className="border border-dark-400 text-slate-500 hover:text-slate-300 px-4 py-3 text-xs font-mono uppercase tracking-widest transition-colors"
              >
                RESET
              </button>
            )}
          </div>

          {/* Terminal log */}
          {log.length > 0 && (
            <div className="bg-dark-900 border border-dark-500 p-4">
              <p className="text-slate-600 text-xs font-mono mb-2 uppercase tracking-widest">// process log</p>
              {log.map((line, i) => (
                <p key={i} className={`text-xs font-mono ${i === log.length - 1 ? "text-terminal-green" : "text-slate-500"}`}>
                  {line}
                </p>
              ))}
              {loading && (
                <p className="text-terminal-green text-xs font-mono mt-1">
                  processing<span className="blink">_</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          <div className="bg-dark-600 border border-dark-500 px-4 py-2 mb-0">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
              Analysis Results
            </p>
          </div>
          {!result ? (
            <div className="border border-dark-500 border-t-0 bg-dark-800 aspect-video flex items-center justify-center">
              <p className="text-slate-600 text-xs font-mono">Awaiting image upload...</p>
            </div>
          ) : (
            <div className="border border-dark-500 border-t-0 bg-dark-700 p-4">
              <ImageResult result={result} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
