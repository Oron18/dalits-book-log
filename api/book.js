const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

async function getBookDetails(productUrl) {
  const response = await axios.get(productUrl, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(response.data);
  const html = response.data;

  let book = { title: '', author: '', description: '', imageUrl: '', productUrl, price: '' };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Book') {
        book.title = data.name || book.title;
        book.author = Array.isArray(data.author)
          ? data.author.map((a) => a.name).join(', ')
          : data.author?.name || book.author;
        book.description = data.description || book.description;
        book.imageUrl = data.image || book.imageUrl;
        if (!book.price && data.offers) {
          const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
          const offer = offers.find((o) => o.price) || offers[0];
          if (offer?.price) {
            const num = parseFloat(String(offer.price).replace(',', '.'));
            if (!isNaN(num)) book.price = `₪${num % 1 === 0 ? num : num.toFixed(2)}`;
          }
        }
      }
    } catch (_e) {}
  });

  if (!book.author) {
    const m1 = html.match(/"author"\s*:\s*"([^"]+)"/);
    if (m1) book.author = m1[1];
  }
  if (!book.author) {
    const m2 = html.match(/const authorList\s*=\s*\[["']([^"']+)["']/);
    if (m2) book.author = m2[1];
  }

  if (!book.title)
    book.title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || '';
  if (!book.description)
    book.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
  if (!book.imageUrl)
    book.imageUrl = $('meta[property="og:image"]').attr('content') || '';

  if (book.description && book.description.length > 400)
    book.description = book.description.substring(0, 397) + '...';

  if (!book.price) {
    const m = html.match(/"DigitalClubMemberPrice"\s*:\s*([\d.]+)/)
           || html.match(/"DigitalOriginalPrice"\s*:\s*([\d.]+)/);
    if (m) {
      const num = parseFloat(m[1]);
      if (!isNaN(num)) book.price = `₪${num % 1 === 0 ? num : num.toFixed(2)}`;
    }
  }

  book.id = productUrl;
  return book;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url } = req.query;
  if (!url || !url.includes('e-vrit.co.il')) {
    return res.status(400).json({ error: 'יש להזין לינק תקין מאתר e-vrit.co.il' });
  }
  try {
    const book = await getBookDetails(url);
    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בטעינת פרטי הספר. בדקי שהלינק תקין.' });
  }
};
