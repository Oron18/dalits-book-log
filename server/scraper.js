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
  try {
    const response = await axios.get(productUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    const html = response.data;

    let book = { title: '', author: '', description: '', imageUrl: '', productUrl };

    // Try JSON-LD structured data first
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
        }
      } catch (_e) {}
    });

    // Extract author from inline JS variables if still missing
    if (!book.author) {
      const m1 = html.match(/"author"\s*:\s*"([^"]+)"/);
      if (m1) book.author = m1[1];
    }
    if (!book.author) {
      const m2 = html.match(/const authorList\s*=\s*\[["']([^"']+)["']/);
      if (m2) book.author = m2[1];
    }

    // Fallback to meta tags
    if (!book.title)
      book.title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || '';
    if (!book.description)
      book.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    if (!book.imageUrl)
      book.imageUrl = $('meta[property="og:image"]').attr('content') || '';

    // Trim long descriptions
    if (book.description && book.description.length > 400)
      book.description = book.description.substring(0, 397) + '...';

    // ── Extract digital book price ────────────────────────────
    book.price = '';

    // Strategy 1: Cheerio — find container with "דיגיטלי" text, get price inside it
    $('*').each((_, el) => {
      if (book.price) return false; // already found
      const $el = $(el);
      const ownText = $el.clone().children().remove().end().text().trim();
      if (ownText === 'ספר דיגיטלי' || ownText === 'דיגיטלי') {
        // look in parent container for a price
        const $card = $el.closest('[class]');
        const priceText = $card.text();
        const m = priceText.match(/₪\s*([\d.,]+)/);
        if (m) book.price = `₪${m[1]}`;
      }
    });

    // Strategy 2: Regex on raw HTML — find ₪XX near "דיגיטלי"
    if (!book.price) {
      // forward: "דיגיטלי" then price within 300 chars
      const m1 = html.match(/דיגיטלי[\s\S]{0,300}?₪\s*([\d.,]+)/);
      if (m1) book.price = `₪${m1[1]}`;
    }
    if (!book.price) {
      // reverse: price then "דיגיטלי" within 300 chars
      const m2 = html.match(/₪\s*([\d.,]+)[\s\S]{0,300}?דיגיטלי/);
      if (m2) book.price = `₪${m2[1]}`;
    }

    book.id = productUrl;
    return book;
  } catch (err) {
    console.error('Book detail error:', err.message);
    throw new Error('שגיאה בטעינת פרטי הספר. בדקי שהלינק תקין.');
  }
}

module.exports = { getBookDetails };
