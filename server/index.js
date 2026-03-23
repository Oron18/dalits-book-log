require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getBookDetails } = require('./scraper');
const importBooks = require('../api/import-books');

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

// Serve React client
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
