import ReviewInput from '../components/ReviewInput.jsx';

export default function ReadingLog({ books, onUpdateReview }) {
  if (books.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <p>עדיין לא סיימת ספרים</p>
          <p className="empty-hint">לחצי על "קראתי!" בספר ברשימת הממתינים להעביר אותו לכאן</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="book-list">
        {books.map((book) => (
          <div key={book.id} className="log-card">
            <div className="book-card-inner">
              <div className="book-cover">
                {book.imageUrl ? (
                  <img src={book.imageUrl} alt={book.title} loading="lazy" />
                ) : (
                  <div className="cover-placeholder">📚</div>
                )}
              </div>
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                {book.author && <p className="book-author">{book.author}</p>}
                {book.dateAdded && (
                  <p className="book-date">
                    נקרא: {new Date(book.dateAdded).toLocaleDateString('he-IL')}
                  </p>
                )}
                {book.description && (
                  <p className="book-description">{book.description}</p>
                )}
              </div>
            </div>
            <ReviewInput
              bookId={book.id}
              initialReview={book.review}
              onSave={onUpdateReview}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
