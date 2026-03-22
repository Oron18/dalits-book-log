import { useState, useRef } from 'react';

export default function AddBookForm({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const overlayRef = useRef();

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: `manual-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      imageUrl: '',
      productUrl: '',
    });
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        <h2 className="modal-title">הוספת ספר לרשימה</h2>

        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">שם הספר *</label>
            <input
              type="text"
              className="form-input"
              placeholder="הכניסי את שם הספר"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">שם הסופר/ת</label>
            <input
              type="text"
              className="form-input"
              placeholder="הכניסי את שם הסופר/ת"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">תקציר</label>
            <textarea
              className="form-textarea"
              placeholder="כמה מילים על הספר..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <button type="submit" className="add-btn" disabled={!title.trim()}>
            + הוסף לרשימת הקריאה
          </button>
        </form>
      </div>
    </div>
  );
}
