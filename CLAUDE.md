# יומן הקריאה של דלית — CLAUDE.md

Personal book-log app for Dalit. Hebrew RTL UI, mobile-first.
Deployed on Vercel. Source: https://github.com/Oron18/dalits-book-log

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (JSX, no TypeScript) |
| Backend (prod) | Vercel Serverless Functions (`api/`) |
| Backend (local) | Express.js (`server/`) on port 5000 |
| Scraping | axios + cheerio |
| Storage (prod) | JSONBin.io via `api/store.js` |
| Storage (local) | `store.json` file (gitignored) |
| Storage (fallback) | localStorage per-device |

---

## Project Structure

```
├── api/                      # Vercel serverless functions
│   ├── book.js               # GET /api/book?url=... — scrape e-vrit book details
│   ├── import-books.js       # POST /api/import-books — scrape purchased books list
│   └── store.js              # GET/PUT /api/store — shared persistent data (JSONBin.io)
│
├── server/                   # Express server (localhost only)
│   ├── index.js              # Routes mirror api/ + serves client/dist
│   └── scraper.js            # getBookDetails() — keep in sync with api/book.js!
│
├── client/
│   ├── src/
│   │   ├── App.jsx           # Root: tab routing + swipe gestures
│   │   ├── hooks/
│   │   │   ├── useStore.js   # PRIMARY HOOK — all state + server sync
│   │   │   ├── useBooks.js   # Legacy (not used by App.jsx anymore)
│   │   │   └── usePriceTracker.js  # Legacy (not used by App.jsx anymore)
│   │   ├── pages/
│   │   │   ├── WaitingList.jsx  # Tab: ממתין לקריאה
│   │   │   ├── ReadingLog.jsx   # Tab: יומן קריאה
│   │   │   └── PriceTracker.jsx # Tab: מעקב מחירים
│   │   └── components/
│   │       ├── BookCard.jsx
│   │       ├── AddBookForm.jsx
│   │       ├── ImportModal.jsx  # Import from e-vrit account (CAPTCHA issues)
│   │       ├── SearchModal.jsx
│   │       └── ReviewInput.jsx
│   └── index.css             # All styles (RTL, mobile-first, CSS variables)
│
├── package.json              # Root — axios + cheerio (used by api/ on Vercel)
└── store.json                # Local dev data file (gitignored)
```

---

## Navigation Tabs (RTL order — right to left)

```
TABS = ['prices', 'waiting', 'log']
```

| Tab key | Label | Icon |
|---------|-------|------|
| `prices` | מעקב מחירים | 💰 |
| `waiting` | ממתין לקריאה | 📚 |
| `log` | יומן קריאה | 📖 |

Swipe gestures: RTL — swipe right → previous tab, swipe left → next tab.
Default tab on load: `'waiting'`.

---

## API Endpoints

### `GET /api/book?url=<e-vrit-url>`
Scrapes a book page and returns:
```json
{
  "id": "<url>",
  "title": "...",
  "author": "...",
  "description": "...",
  "imageUrl": "...",
  "productUrl": "<url>",
  "price": "₪44"
}
```
Price extraction order:
1. JSON-LD `@type:"Book"` → `offers[0].price`
2. Inline JS: `"DigitalClubMemberPrice": <num>` (often null)
3. Inline JS: `"DigitalOriginalPrice": <num>` (usually has value)

**IMPORTANT**: `api/book.js` and `server/scraper.js` must stay in sync.
Vercel uses `api/book.js`. The server uses `server/scraper.js`. They share identical logic.

### `POST /api/import-books`
Scrapes purchased books from e-vrit account.
Returns `{ captchaRequired: true }` if blocked by CAPTCHA (common on Vercel IPs).

### `GET /api/store`
Returns full shared data: `{ waitingList, readingLog, trackedBooks }`

### `PUT /api/store`
Saves full shared data. Body: `{ waitingList, readingLog, trackedBooks }`

---

## Data Model

All data lives in one unified store:

```json
{
  "waitingList": [
    {
      "id": "https://www.e-vrit.co.il/Product/...",
      "title": "שם הספר",
      "author": "שם המחבר",
      "imageUrl": "https://...",
      "productUrl": "https://...",
      "description": "..."
    }
  ],
  "readingLog": [
    {
      "id": "...",
      "title": "...",
      "author": "...",
      "imageUrl": "...",
      "productUrl": "...",
      "description": "...",
      "review": "הביקורת של דלית",
      "dateAdded": "2024-01-15T00:00:00.000Z"
    }
  ],
  "trackedBooks": [
    {
      "id": "https://www.e-vrit.co.il/Product/...",
      "title": "...",
      "author": "...",
      "imageUrl": "...",
      "productUrl": "...",
      "currentPrice": "₪44",
      "lastChecked": "2024-01-15T00:00:00.000Z",
      "priceChangedNotification": {
        "from": "₪59.90",
        "to": "₪44",
        "date": "2024-01-15T00:00:00.000Z"
      }
    }
  ]
}
```

`priceChangedNotification` is `null` when no active alert, object when price changed and user hasn't dismissed.

---

## State Management — useStore.js

Single hook used by `App.jsx`. Replaces the old `useBooks` + `usePriceTracker`.

**Load order on mount:**
1. localStorage (instant, fallback)
2. `GET /api/store` (overwrites if successful)
3. Price check: stale books (not checked in 24h) are re-fetched

**Save on change:**
- localStorage (immediate)
- `PUT /api/store` (debounced 800ms, only if server responded successfully on mount)

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `JSONBIN_BIN_ID` | Vercel | JSONBin.io bin ID for shared storage |
| `JSONBIN_API_KEY` | Vercel | JSONBin.io master key |

If these are missing, `api/store.js` returns `{ _unconfigured: true }` and the client falls back to localStorage.

---

## Development

```bash
# Install all dependencies
npm run install:all

# Run both client (port 5173) and server (port 5000) together
npm run dev

# Build for production
npm run build
```

Vite proxies `/api/*` to `http://localhost:5000` in dev mode.

---

## Deployment — Vercel

- Auto-deploys on `git push` to `master`
- `api/` directory = serverless functions
- Root `package.json` dependencies available to all functions
- **After adding env vars → must Redeploy manually** (Vercel Settings → Deployments → Redeploy)

---

## Known Issues & Gotchas

1. **api/book.js vs server/scraper.js**: These are TWO separate copies of the same logic.
   When fixing scraping bugs, **always update both files**.

2. **e-vrit.co.il is a React SPA**: Static HTML has no visible prices/text.
   All data is in: JSON-LD `<script>` tags, inline JS variables (`DigitalOriginalPrice`, etc.).

3. **Import from account (ImportModal)**: e-vrit blocks Vercel's IPs with CAPTCHA.
   The import feature works on localhost but usually fails on Vercel — expected behavior,
   shows fallback UI with link to open e-vrit manually.

4. **Price "מחיר לא זמין"**: If price shows as unavailable after adding, remove and re-add
   (localStorage may have cached the old book data without price field).

5. **Shared store on Vercel**: JSONBin.io free tier has rate limits (100 requests/day on free plan).
   Not an issue for personal use.

6. **store.json**: Local data file, gitignored. Do not commit it.
