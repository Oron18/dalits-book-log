const axios = require('axios');

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_API_KEY;
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const EMPTY_STORE = { waitingList: [], readingLog: [], trackedBooks: [] };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!BIN_ID || !API_KEY) {
    // Storage not configured — return empty so client falls back to localStorage
    if (req.method === 'GET') return res.json({ ...EMPTY_STORE, _unconfigured: true });
    return res.status(503).json({ error: 'Storage not configured' });
  }

  try {
    if (req.method === 'GET') {
      const r = await axios.get(`${BIN_URL}/latest`, {
        headers: { 'X-Master-Key': API_KEY },
      });
      return res.json(r.data.record || EMPTY_STORE);
    }

    if (req.method === 'PUT') {
      const body = req.body || EMPTY_STORE;
      await axios.put(BIN_URL, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
        },
      });
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error('Store error:', err.message);
    res.status(500).json({ error: 'שגיאה בשמירת הנתונים' });
  }
};
