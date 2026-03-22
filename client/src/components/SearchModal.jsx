import { useState, useEffect, useRef } from 'react';

export default function SearchModal({ query, onClose, onAdd, existingIds }) {
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef();

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSelected(null);

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResults(data);
        if (data.length === 0) setError('לא נמצאו ספרים. נסי מילות חיפוש אחרות.');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  async function handleSelectBook(book) {
    // If we already have details (description), use directly
    if (book.description) {
      setSelected(book);
      return;
    }
    // Otherwise fetch full details
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/book?url=${encodeURIComponent(book.productUrl)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelected({ ...book, ...data });
    } catch (err) {
      setSelected(book); // fallback to partial data
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleAdd() {
    if (!selected) return;
    onAdd(selected);
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  const alreadyAdded = selected && existingIds.includes(selected.id);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>

        {!selected ? (
          <>
            <h2 className="modal-title">תוצאות חיפוש: "{query}"</h2>
            {loading && (
              <div className="loading-state">
                <div className="spinner" />
                <p>מחפשת באתר e-vrit...</p>
              </div>
            )}
            {error && <p className="error-msg">{error}</p>}
            <div className="search-results">
              {results.map((book) => (
                <button
                  key={book.id}
                  className="result-card"
                  onClick={() => handleSelectBook(book)}
                >
                  <div className="result-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} loading="lazy" />
                    ) : (
                      <div className="cover-placeholder">📚</div>
                    )}
                  </div>
                  <div className="result-info">
                    <span className="result-title">{book.title}</span>
                    {book.author && <span className="result-author">{book.author}</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="book-detail">
            {loadingDetail ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>טוענת פרטי ספר...</p>
              </div>
            ) : (
              <>
                <button className="back-btn" onClick={() => setSelected(null)}>
                  ← חזרה לתוצאות
                </button>
                <div className="detail-content">
                  <div className="detail-cover">
                    {selected.imageUrl ? (
                      <img src={selected.imageUrl} alt={selected.title} />
                    ) : (
                      <div className="cover-placeholder large">📚</div>
                    )}
                  </div>
                  <div className="detail-info">
                    <h2 className="detail-title">{selected.title}</h2>
                    {selected.author && (
                      <p className="detail-author">מאת: {selected.author}</p>
                    )}
                    {selected.description && (
                      <div className="detail-description">
                        <h3>תקציר</h3>
                        <p>{selected.description}</p>
                      </div>
                    )}
                    {selected.productUrl && (
                      <a
                        href={selected.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="evrit-link"
                      >
                        עמוד הספר ב-e-vrit ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  className="add-btn"
                  onClick={handleAdd}
                  disabled={alreadyAdded}
                >
                  {alreadyAdded ? '✓ כבר ברשימה' : '+ הוסף לרשימת הקריאה'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
