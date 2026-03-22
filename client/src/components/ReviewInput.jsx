import { useState } from 'react';

export default function ReviewInput({ bookId, initialReview, onSave }) {
  const [review, setReview] = useState(initialReview || '');
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(!!initialReview);

  function handleSave() {
    onSave(bookId, review);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="review-section">
      <button className="review-toggle" onClick={() => setOpen((p) => !p)}>
        <span>מה חשבתי על הספר</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="review-body">
          <textarea
            className="review-textarea"
            placeholder="כתבי את המחשבות שלך על הספר..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
          />
          <button
            className={`save-review-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
          >
            {saved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      )}
      {!open && initialReview && (
        <p className="review-preview">"{initialReview.substring(0, 80)}{initialReview.length > 80 ? '...' : ''}"</p>
      )}
    </div>
  );
}
