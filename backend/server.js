// Load environment variables
require('dotenv').config();

const path = require('path');
const fs = require('fs');

// Serve React build (if present)
const buildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  // any unknown route serve index.html (SPA)
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}


// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');

// Create app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Config
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/urlshortener';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// Schema & Model
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  visitCount: { type: Number, default: 0 }
}, { timestamps: true });

const Url = mongoose.model('Url', urlSchema);

// Helper function to validate URLs
function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:');
  } catch (e) {
    return false;
  }
}


app.post('/api/shorten', async (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) return res.status(400).json({ error: 'originalUrl is required' });

  if (!isValidHttpUrl(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL. Use http:// or https:// scheme.' });
  }

  try {

    const existing = await Url.findOne({ originalUrl });
    if (existing) {
      return res.json({ shortUrl: `${BASE_URL}/${existing.shortCode}`, shortCode: existing.shortCode });
    }

    // Generate unique short code
    let shortCode;
    while (true) {
      shortCode = shortid.generate().slice(0, 7);
      const collision = await Url.findOne({ shortCode });
      if (!collision) break;
    }

    const urlDoc = new Url({ originalUrl, shortCode });
    await urlDoc.save();

    return res.json({ shortUrl: `${BASE_URL}/${shortCode}`, shortCode });
  } catch (err) {
    console.error('POST /api/shorten error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  try {
    const url = await Url.findOne({ shortCode });
    if (!url) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ error: 'Short URL not found' });
      }
      return res.status(404).send('<h2>404 — Short URL not found</h2>');
    }

    url.visitCount += 1;
    await url.save();

    return res.redirect(url.originalUrl);
  } catch (err) {
    console.error('Redirect error:', err);
    return res.status(500).send('Server error');
  }
});

app.get('/api/admin/urls', async (req, res) => {
  const token = req.header('x-admin-token') || '';
  if (process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const urls = await Url.find().sort({ createdAt: -1 });
    return res.json(urls);
  } catch (err) {
    console.error('Admin list error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
