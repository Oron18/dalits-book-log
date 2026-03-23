import { useState } from 'react';
import BookCard from '../components/BookCard.jsx';
import AddBookForm from '../components/AddBookForm.jsx';
import ImportModal from '../components/ImportModal.jsx';

export default function WaitingList({ books, readingLog, onAddBook, onMoveToLog, onRemove }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const allIds = [...books, ...(readingLog || [])].map((b) => b.id);

  const filtered = searchQuery.trim()
    ? books.filter(
        (b) =>
          b.title.includes(searchQuery) ||
          (b.author && b.author.includes(searchQuery))
      )
    : books;

  async function handleLinkSubmit(e) {
    e.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;

    const alreadyAdded = books.some((b) => b.id === url || b.productUrl === url);
    if (alreadyAdded) {
      setLinkError('הספר כבר נמצא ברשימה');
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
      {/* Search within list */}
      <div className="search-row">
        <input
          type="search"
          className="search-input"
          placeholder="חיפוש ברשימה..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Import from account */}
      <button className="import-account-btn" onClick={() => setShowImport(true)}>
        ☁️ ייבא ספרים מחשבון e-vrit
      </button>

      {/* Add by e-vrit link */}
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
        <a
          href="https://www.e-vrit.co.il/"
          target="_blank"
          rel="noopener noreferrer"
          className="evrit-link-small"
        >
          🔍 פתח את e-vrit.co.il
        </a>
      </div>

      {/* Manual add button */}
      <div className="manual-add-row">
        <button className="add-manual-btn" onClick={() => setShowAddForm(true)}>
          + הוסף ספר ידנית
        </button>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <p>הרשימה ריקה</p>
          <p className="empty-hint">הדביקי לינק לספר מ-e-vrit כדי להוסיפו לרשימה</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>לא נמצאו ספרים עבור "{searchQuery}"</p>
        </div>
      ) : (
        <div className="book-list">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onMoveToLog={onMoveToLog}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <AddBookForm
          onClose={() => setShowAddForm(false)}
          onAdd={(book) => {
            onAddBook(book);
            setShowAddForm(false);
          }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onAdd={onAddBook}
          existingIds={allIds}
        />
      )}
    </div>
  );
}
