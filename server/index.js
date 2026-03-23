require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getBookDetails } = require('./scraper');
const importBooks = require('../api/import-books');

const STORE_FILE = path.join(__dirname, '..', 'store.json');
const EMPTY_STORE = { waitingList: [], readingLog: [], trackedBooks: [] };

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch (_) {}
  return { ...EMPTY_STORE };
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fetch book details from e-vrit.co.il URL
app.get('/api/book', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.includes('e-vrit.co.il')) {
    return res.status(400).json({ error: 'יש להזין לינק תקין מאתר e-vrit.co.il' });
  }
  try {
    const book = await getBookDetails(url);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import books from e-vrit account
app.post('/api/import-books', importBooks);

// Shared data store
app.get('/api/store', (req, res) => res.json(readStore()));
app.put('/api/store', (req, res) => {
  writeStore(req.body);
  res.json({ ok: true });
});

// Serve React client
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
