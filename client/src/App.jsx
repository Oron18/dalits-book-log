import { useState, useRef } from 'react';
import WaitingList from './pages/WaitingList.jsx';
import ReadingLog from './pages/ReadingLog.jsx';
import { useBooks } from './hooks/useBooks.js';

const TABS = ['waiting', 'log'];

export default function App() {
  const [activeTab, setActiveTab] = useState('waiting');
  const { waitingList, readingLog, addToWaiting, moveToLog, updateReview,
          removeFromWaiting, removeFromLog, moveBackToWaiting } = useBooks();

  const touchStart = useRef(null);

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only act on clearly horizontal swipes
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const currentIndex = TABS.indexOf(activeTab);
    // RTL: swipe right → previous tab (ממתין), swipe left → next tab (יומן)
    if (dx > 0 && currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
    if (dx < 0 && currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>יומן הקריאה של דלית</h1>
      </header>

      <main
        className="app-main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'waiting' ? (
          <WaitingList
            books={waitingList}
            readingLog={readingLog}
            onAddBook={addToWaiting}
            onMoveToLog={moveToLog}
            onRemove={removeFromWaiting}
          />
        ) : (
          <ReadingLog
            books={readingLog}
            onUpdateReview={updateReview}
            onRemove={removeFromLog}
            onMoveBack={moveBackToWaiting}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-tab ${activeTab === 'waiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('waiting')}
        >
          <span className="nav-icon">📚</span>
          <span className="nav-label">ממתין לקריאה</span>
          {waitingList.length > 0 && (
            <span className="nav-badge">{waitingList.length}</span>
          )}
        </button>
        <button
          className={`nav-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <span className="nav-icon">📖</span>
          <span className="nav-label">יומן קריאה</span>
          {readingLog.length > 0 && (
            <span className="nav-badge">{readingLog.length}</span>
          )}
        </button>
      </nav>
    </div>
  );
}
