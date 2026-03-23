import { useState, useRef } from 'react';
import WaitingList from './pages/WaitingList.jsx';
import ReadingLog from './pages/ReadingLog.jsx';
import PriceTracker from './pages/PriceTracker.jsx';
import { useStore } from './hooks/useStore.js';

const TABS = ['prices', 'waiting', 'log'];

export default function App() {
  const [activeTab, setActiveTab] = useState('waiting');
  const {
    waitingList, readingLog, addToWaiting, moveToLog, updateReview,
    removeFromWaiting, removeFromLog, moveBackToWaiting,
    trackedBooks, addTrackedBook, removeTrackedBook, refreshTrackedBook,
    dismissNotification, changesCount, lastSynced,
  } = useStore();

  const touchStart = useRef(null);

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const currentIndex = TABS.indexOf(activeTab);
    // RTL: swipe right → previous tab, swipe left → next tab
    if (dx > 0 && currentIndex > 0) setActiveTab(TABS[currentIndex - 1]);
    if (dx < 0 && currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1]);
  }

  function handleMoveToWaiting(book) {
    addToWaiting({
      id: book.id,
      title: book.title,
      author: book.author,
      imageUrl: book.imageUrl,
      productUrl: book.productUrl,
      description: '',
    });
    setActiveTab('waiting');
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>יומן הקריאה של דלית</h1>
        {lastSynced && (
          <p className="last-synced">
            עודכן: {lastSynced.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </header>

      <main
        className="app-main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'prices' && (
          <PriceTracker
            books={trackedBooks}
            onAddBook={addTrackedBook}
            onRemove={removeTrackedBook}
            onRefresh={refreshTrackedBook}
            onDismissNotification={dismissNotification}
            onMoveToWaiting={handleMoveToWaiting}
          />
        )}
        {activeTab === 'waiting' && (
          <WaitingList
            books={waitingList}
            readingLog={readingLog}
            onAddBook={addToWaiting}
            onMoveToLog={moveToLog}
            onRemove={removeFromWaiting}
          />
        )}
        {activeTab === 'log' && (
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
          className={`nav-tab ${activeTab === 'prices' ? 'active' : ''}`}
          onClick={() => setActiveTab('prices')}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-label">מעקב מחירים</span>
          {changesCount > 0 && (
            <span className="nav-badge">{changesCount}</span>
          )}
        </button>
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
