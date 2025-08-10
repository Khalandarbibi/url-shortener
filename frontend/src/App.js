import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidUrl = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShortUrl("");

    const trimmed = originalUrl.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/api/shorten`, { originalUrl: trimmed });
      setShortUrl(res.data.shortUrl);
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      alert("Copied to clipboard!");
    } catch {
      alert("Copy failed — please copy manually.");
    }
  };

  return (
    <div className="container">
      <h1> URL Shortener</h1>
      <p className="subtitle">Make long links short — quick & easy</p>

      <form className="url-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="https://example.com/some/long/path"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {shortUrl && (
        <div className="result">
          <p>Your short link:</p>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
          <div style={{ marginTop: 8 }}>
            <button onClick={handleCopy} style={{ padding: '6px 10px', borderRadius: 6 }}>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
