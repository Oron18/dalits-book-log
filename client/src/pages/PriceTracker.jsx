import { useState } from 'react';

export default function PriceTracker({
  books,
  onAddBook,
  onRemove,
  onDismissNotification,
  onMoveToWaiting,
}) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  async function handleLinkSubmit(e) {
    e.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;

    const alreadyAdded = books.some((b) => b.id === url || b.productUrl === url);
    if (alreadyAdded) {
      setLinkError('הספר כבר במעקב');
      return;
    }

    setLinkLoading(true);
    setLinkError('');
    try {
      const res = await fetch(`/api/book?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onAddBook(data);
      setLinkUrl('');
    } catch (err) {
      setLinkError(err.message || 'שגיאה בטעינת הספר');
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div className="page">
      {/* Add book by URL */}
      <div className="link-section">
        <form className="link-form" onSubmit={handleLinkSubmit}>
          <input
            type="url"
            className="link-input"
            placeholder="לינק לספר מאתר e-vrit.co.il"
            value={linkUrl}
            onChange={(e) => { setLinkUrl(e.target.value); setLinkError(''); }}
            dir="ltr"
            inputMode="url"
          />
          <button
            type="submit"
            className="link-btn"
            disabled={!linkUrl.trim() || linkLoading}
          >
            {linkLoading ? <span className="btn-spinner" /> : 'הוסף'}
          </button>
        </form>
        {linkError && <p className="link-error">{linkError}</p>}
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <p>אין ספרים במעקב מחירים</p>
          <p className="empty-hint">הדביקי לינק לספר מ-e-vrit כדי לעקוב אחרי המחיר שלו</p>
        </div>
      ) : (
        <div className="book-list">
          {books.map((book) => (
            <div key={book.id} className="price-card">
              {/* Price change banner */}
              {book.priceChangedNotification && (
                <div className="price-change-banner">
                  <span>
                    ⚠️ מחיר הספר השתנה מ-
                    <strong>{book.priceChangedNotification.from}</strong>
                    {' '}ל-
                    <strong>{book.priceChangedNotification.to}</strong>
                  </span>
                  <div className="price-change-actions">
                    <a
                      href={book.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="price-change-link"
                    >
                      🛒 לרכישה
                    </a>
                    <button
                      className="price-banner-close"
                      onClick={() => onDismissNotification(book.id)}
                      aria-label="סגור"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="price-card-body">
                {/* Cover */}
                <div className="price-cover">
                  {book.imageUrl ? (
                    <img src={book.imageUrl} alt={book.title} loading="lazy" />
                  ) : (
                    <span className="price-cover-placeholder">📚</span>
                  )}
                </div>

                {/* Info */}
                <div className="price-info">
                  <p className="price-title">{book.title}</p>
                  {book.author && <p className="price-author">{book.author}</p>}
                  {book.currentPrice ? (
                    <p className="price-badge">
                      <span className="price-label">ספר דיגיטלי</span>
                      {book.currentPrice}
                    </p>
                  ) : (
                    <p className="price-unavailable">מחיר לא זמין</p>
                  )}
                </div>

                {/* Actions */}
                <div className="price-actions">
                  <button
                    className="price-move-btn"
                    onClick={() => onMoveToWaiting(book)}
                    title="הוסף לממתין לקריאה"
                  >
                    📚
                  </button>
                  <button
                    className="price-remove-btn"
                    onClick={() => onRemove(book.id)}
                    title="הסר"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
