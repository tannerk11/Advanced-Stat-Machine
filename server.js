// server.js
const express = require('express');
const cors = require('cors');
const { getGameStats } = require('./scraper'); // this matches scraper.js

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public')); // serve /public as static frontend

// GET /api/stats?url=...
app.get('/api/stats', async (req, res) => {
  const gameUrl = req.query.url;

  if (!gameUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const stats = await getGameStats(gameUrl);
    res.json(stats);
  } catch (err) {
    console.error('Scraper error:', err);
    res.status(500).json({ error: 'Failed to scrape stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
