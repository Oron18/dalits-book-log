import { useState, useRef } from 'react';

export default function ImportModal({ onClose, onAdd, existingIds }) {
  const [books, setBooks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [selected, setSelected] = useState(new Set());
  const overlayRef = useRef();

  async function fetchBooks() {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/import-books', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'שגיאה בייבוא');
      setBooks(data.books || []);
      if (data.warning) setWarning(data.warning);
      // Pre-select all books not already in list
      const newIds = new Set(
        (data.books || [])
          .filter((b) => !existingIds.includes(b.id) && !existingIds.includes(b.productUrl))
          .map((b) => b.id)
      );
      setSelected(newIds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const toAdd = (books || []).filter((b) => selected.has(b.id));
    toAdd.forEach((b) => onAdd(b));
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  const alreadyIn = (book) =>
    existingIds.includes(book.id) || existingIds.includes(book.productUrl);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        <h2 className="modal-title">ייבוא ספרים מחשבון e-vrit</h2>

        {books === null && !loading && (
          <div className="import-start">
            <p className="import-desc">תחבר לחשבון e-vrit שלך ומשוך את רשימת הספרים שרכשת.</p>
            <button className="add-btn" onClick={fetchBooks}>
              🔄 התחבר ומשוך ספרים
            </button>
            {error && <p className="error-msg">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>מתחבר לאתר e-vrit ומושך ספרים...</p>
          </div>
        )}

        {books !== null && !loading && (
          <>
            {warning && <p className="import-warning">⚠️ {warning}</p>}
            {error && <p className="error-msg">{error}</p>}

            {books.length === 0 ? (
              <p className="error-msg">לא נמצאו ספרים בחשבון.</p>
            ) : (
              <>
                <p className="import-count">{books.length} ספרים נמצאו — {selected.size} נבחרו</p>
                <div className="import-list">
                  {books.map((book) => {
                    const inList = alreadyIn(book);
                    return (
                      <label
                        key={book.id}
                        className={`import-item ${inList ? 'import-item-done' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(book.id)}
                          disabled={inList}
                          onChange={() => toggleSelect(book.id)}
                          className="import-checkbox"
                        />
                        <div className="import-cover">
                          {book.imageUrl ? (
                            <img src={book.imageUrl} alt={book.title} loading="lazy" />
                          ) : (
                            <span>📚</span>
                          )}
                        </div>
                        <div className="import-info">
                          <span className="import-title">{book.title}</span>
                          {book.author && <span className="import-author">{book.author}</span>}
                          {inList && <span className="import-badge">כבר ברשימה</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <button
                  className="add-btn"
                  onClick={handleAdd}
                  disabled={selected.size === 0}
                >
                  + הוסף {selected.size} ספרים לרשימה
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
