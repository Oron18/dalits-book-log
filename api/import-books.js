const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://www.e-vrit.co.il';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
};

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return arr.map((c) => c.split(';')[0]).join('; ');
}

function mergeCookies(existing, newCookies) {
  if (!newCookies) return existing;
  const map = {};
  [...existing.split('; '), ...newCookies.split('; ')]
    .filter(Boolean)
    .forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) map[k.trim()] = v || '';
    });
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractBooksFromHtml(html) {
  const $ = cheerio.load(html);
  const books = [];
  const selectors = ['.topSoldItemContainer', '[class*="product-item"]', '[class*="ProductItem"]'];
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
      if (title) books.push({
        id: href,
        title,
        author,
        imageUrl: img.startsWith('http') ? img : img ? `${BASE}${img}` : '',
        productUrl: href.startsWith('http') ? href : `${BASE}${href}`,
        description: '',
      });
    });
    if (books.length > 0) break;
  }
  return books;
}

function extractBooksFromJson(data) {
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
      ? (p.Url || p.url) : `${BASE}${p.Url || p.url || ''}`,
    description: p.Description || p.description || '',
  })).filter((b) => b.title);
}

const BOOK_API_CANDIDATES = [
  '/CustomerApi/GetCustomerProducts',
  '/CustomerApi/CustomerProductsList',
  '/CustomerApi/GetPurchasedProducts',
  '/api/CustomerApi/GetCustomerProducts',
  '/CustomerApi/GetAllCustomerProducts',
  '/CustomerApi/GetCustomerProductsNew',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = process.env.EVRIT_EMAIL;
  const password = process.env.EVRIT_PASSWORD;
  if (!email || !password) return res.status(500).json({ error: 'פרטי ההתחברות לא הוגדרו בשרת' });

  try {
    // ── Step 1: Visit login page to get initial session cookies ────
    // maxRedirects: 0 prevents following any HTTP redirect (which causes ECONNREFUSED on port 80)
    let cookies = '';
    try {
      const initRes = await axios.get(`${BASE}/Login`, {
        headers: { ...BROWSER_HEADERS, Accept: 'text/html,application/xhtml+xml,*/*;q=0.9' },
        timeout: 8000,
        validateStatus: () => true,
        maxRedirects: 0,
      });
      cookies = parseCookies(initRes.headers['set-cookie']);
    } catch (_) {
      // Proceed without initial session cookies if the page is unreachable
    }

    // ── Step 2: Attempt login ──────────────────────────────────────
    // Try with empty string captchaToken first, then null
    let loginData = null;
    let loginStatus = 0;

    for (const captchaToken of ['', null]) {
      const loginRes = await axios.post(
        `${BASE}/CustomerApi/LoginCustomer`,
        { email, password, rememberMe: true, captchaToken, SessionCustomerViewsProducts: [] },
        {
          headers: {
            ...BROWSER_HEADERS,
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json; charset=UTF-8',
            'Cookie': cookies,
            'Referer': `${BASE}/Login`,
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 15000,
          validateStatus: () => true,
        }
      );

      loginStatus = loginRes.status;
      const newCookies = parseCookies(loginRes.headers['set-cookie']);
      if (newCookies) cookies = mergeCookies(cookies, newCookies);
      loginData = loginRes.data;

      // Success check
      if (loginRes.status === 200 && loginData?.IsLoginSuccess !== false) break;
    }

    // ── Step 3: Evaluate login result ─────────────────────────────
    if (loginData?.IsLoginSuccess === false || loginData?.isLoginSuccess === false) {
      const reason = loginData?.ErrorMessage || loginData?.errorMessage || '';
      const captchaNeeded = JSON.stringify(loginData).toLowerCase().includes('captcha');
      if (captchaNeeded) {
        return res.status(401).json({
          error: 'האתר דורש CAPTCHA. לחצי על הכפתור "התחברות ידנית" במקום.',
          captchaRequired: true,
        });
      }
      return res.status(401).json({ error: `שגיאת התחברות: ${reason || 'שם משתמש או סיסמה שגויים'}` });
    }

    if (loginStatus !== 200) {
      return res.status(401).json({
        error: `האתר e-vrit לא אישר את ההתחברות (קוד: ${loginStatus}). ייתכן שנדרש CAPTCHA.`,
        captchaRequired: true,
      });
    }

    const authHeaders = {
      ...BROWSER_HEADERS,
      'Accept': 'application/json, text/plain, */*',
      'Cookie': cookies,
      'Referer': `${BASE}/CustomerProducts`,
    };

    // ── Step 4: Try known API endpoints ───────────────────────────
    for (const endpoint of BOOK_API_CANDIDATES) {
      try {
        const apiRes = await axios.get(`${BASE}${endpoint}`, {
          headers: authHeaders,
          timeout: 10000,
          validateStatus: (s) => s < 500,
        });
        if (apiRes.status === 200 && apiRes.data) {
          const books = extractBooksFromJson(apiRes.data);
          if (books && books.length > 0) return res.json({ books });
        }
      } catch (_) {}
    }

    // ── Step 5: Fallback – scrape HTML page ────────────────────────
    const pageRes = await axios.get(`${BASE}/CustomerProducts`, {
      headers: { ...authHeaders, Accept: 'text/html,application/xhtml+xml,*/*' },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (pageRes.status !== 200) {
      return res.status(401).json({
        error: `ההתחברות הצליחה אך הדף לא נגיש (קוד: ${pageRes.status}). ייתכן שנדרש CAPTCHA.`,
        captchaRequired: true,
      });
    }

    const books = extractBooksFromHtml(pageRes.data);
    if (books.length === 0) {
      return res.status(200).json({
        books: [],
        warning: 'ההתחברות הצליחה אך רשימת הספרים ריקה או שהדף דינמי. נסי את "התחברות ידנית".',
        captchaRequired: false,
      });
    }

    return res.json({ books });

  } catch (err) {
    console.error('Import error:', err.message);
    return res.status(500).json({ error: 'שגיאת חיבור: ' + err.message });
  }
};
