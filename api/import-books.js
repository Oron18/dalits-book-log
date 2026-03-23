const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.e-vrit.co.il';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.7',
  'Content-Type': 'application/json',
  'Origin': BASE,
  'Referer': `${BASE}/Login`,
};

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return arr.map((c) => c.split(';')[0]).join('; ');
}

function extractBooksFromHtml(html) {
  const $ = cheerio.load(html);
  const books = [];

  // Selector patterns for customer products page
  const selectors = [
    '.topSoldItemContainer',
    '[class*="product-item"]',
    '[class*="book-item"]',
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const link = $el.find('a[href*="/Product/"]').first();
      const href = link.attr('href');
      if (!href) return;

      const title =
        $el.find('.product-item-name, [class*="title"], [class*="name"]').first().text().trim() ||
        link.attr('title') || '';
      const author = $el.find('.product-item-authors, [class*="author"]').first().text().trim() || '';
      const img = $el.find('img').first().attr('src') || '';

      if (title) {
        books.push({
          id: href,
          title,
          author,
          imageUrl: img.startsWith('http') ? img : img ? `${BASE}${img}` : '',
          productUrl: href.startsWith('http') ? href : `${BASE}${href}`,
          description: '',
        });
      }
    });
    if (books.length > 0) break;
  }
  return books;
}

function extractBooksFromJson(data) {
  // Try to handle various API response shapes
  const list = data?.Products || data?.products || data?.Items || data?.items ||
    data?.Result?.Products || data?.Data?.Products || data?.data || data;
  if (!Array.isArray(list)) return null;

  return list.map((p) => ({
    id: p.Url || p.url || p.ProductUrl || String(p.ProductId || p.Id || Math.random()),
    title: p.Name || p.ProductName || p.name || '',
    author: Array.isArray(p.Authors) ? p.Authors.map((a) => a.Name || a).join(', ')
      : p.Author || p.author || '',
    imageUrl: p.ImageUrl || p.imageUrl || p.Image || '',
    productUrl: (p.Url || p.url || '').startsWith('http')
      ? (p.Url || p.url)
      : `${BASE}${p.Url || p.url || ''}`,
    description: p.Description || p.description || '',
  })).filter((b) => b.title);
}

// Candidate API endpoints to try after login
const BOOK_API_CANDIDATES = [
  '/CustomerApi/GetCustomerProducts',
  '/CustomerApi/CustomerProductsList',
  '/CustomerApi/GetPurchasedProducts',
  '/api/CustomerApi/GetCustomerProducts',
  '/CustomerApi/GetAllCustomerProducts',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = process.env.EVRIT_EMAIL;
  const password = process.env.EVRIT_PASSWORD;

  if (!email || !password) {
    return res.status(500).json({ error: 'פרטי ההתחברות לא הוגדרו בשרת' });
  }

  try {
    // ── Step 1: Login ──────────────────────────────────────────────
    const loginRes = await axios.post(
      `${BASE}/CustomerApi/LoginCustomer`,
      { email, password, rememberMe: true, captchaToken: null, SessionCustomerViewsProducts: [] },
      { headers: HEADERS, timeout: 15000, maxRedirects: 0, validateStatus: () => true }
    );

    const cookies = parseCookies(loginRes.headers['set-cookie']);

    if (!cookies && loginRes.status !== 200) {
      return res.status(401).json({ error: 'ההתחברות לאתר e-vrit נכשלה. ייתכן שנדרש CAPTCHA.' });
    }

    // Check login success in response body
    const loginData = loginRes.data;
    if (loginData?.IsLoginSuccess === false || loginData?.isLoginSuccess === false) {
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים.' });
    }

    const authHeaders = {
      ...HEADERS,
      Cookie: cookies,
      Referer: `${BASE}/CustomerProducts`,
    };

    // ── Step 2: Try known API endpoints ───────────────────────────
    for (const endpoint of BOOK_API_CANDIDATES) {
      try {
        const apiRes = await axios.get(`${BASE}${endpoint}`, {
          headers: authHeaders,
          timeout: 10000,
          validateStatus: (s) => s < 500,
        });
        if (apiRes.status === 200 && apiRes.data) {
          const books = extractBooksFromJson(apiRes.data);
          if (books && books.length > 0) {
            return res.json({ books, source: endpoint });
          }
        }
      } catch (_) {}
    }

    // ── Step 3: Fallback – scrape the HTML page ────────────────────
    const pageRes = await axios.get(`${BASE}/CustomerProducts`, {
      headers: authHeaders,
      timeout: 15000,
      validateStatus: () => true,
    });

    if (pageRes.status !== 200) {
      return res.status(401).json({ error: 'לא ניתן לגשת לדף הספרים. ייתכן שההתחברות נכשלה.' });
    }

    const books = extractBooksFromHtml(pageRes.data);

    if (books.length === 0) {
      return res.status(200).json({
        books: [],
        warning: 'ההתחברות הצליחה אך לא נמצאו ספרים. הדף עשוי להיות דינמי ולא נגיש בשיטה זו.',
      });
    }

    return res.json({ books });
  } catch (err) {
    console.error('Import error:', err.message);
    return res.status(500).json({ error: 'שגיאה בחיבור לאתר e-vrit: ' + err.message });
  }
};
