import { useState } from 'react';

export default function BookCard({ book, onMoveToLog, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="book-card">
      <div className="book-card-inner">
        {book.productUrl ? (
          <a href={book.productUrl} target="_blank" rel="noopener noreferrer" className="book-cover">
            {book.imageUrl ? (
              <img src={book.imageUrl} alt={book.title} loading="lazy" />
            ) : (
              <div className="cover-placeholder">📚</div>
            )}
          </a>
        ) : (
          <div className="book-cover">
            {book.imageUrl ? (
              <img src={book.imageUrl} alt={book.title} loading="lazy" />
            ) : (
              <div className="cover-placeholder">📚</div>
            )}
          </div>
        )}
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          {book.author && <p className="book-author">{book.author}</p>}
          {book.description && (
            <p className={`book-description ${expanded ? 'expanded' : ''}`}>
              {book.description}
            </p>
          )}
          {book.description && book.description.length > 120 && (
            <button
              className="toggle-desc"
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded ? 'פחות ▲' : 'עוד ▼'}
            </button>
          )}
        </div>
      </div>
      <div className="book-card-actions">
        {onRemove && (
          <button
            className="action-btn remove-btn"
            onClick={() => onRemove(book.id)}
            title="הסר מהרשימה"
          >
            🗑
          </button>
        )}
        {onMoveToLog && (
          <button
            className="action-btn move-btn"
            onClick={() => onMoveToLog(book.id)}
            title="העבר ליומן קריאה"
          >
            <span>קראתי!</span>
            <span className="move-icon">📖 +</span>
          </button>
        )}
      </div>
    </div>
  );
}
