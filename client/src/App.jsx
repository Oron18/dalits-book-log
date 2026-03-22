import { useState } from 'react';
import WaitingList from './pages/WaitingList.jsx';
import ReadingLog from './pages/ReadingLog.jsx';
import { useBooks } from './hooks/useBooks.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('waiting');
  const { waitingList, readingLog, addToWaiting, moveToLog, updateReview, removeFromWaiting, removeFromLog } =
    useBooks();

  return (
    <div className="app">
      <header className="app-header">
        <h1>יומן הקריאה של דלית</h1>
      </header>

      <main className="app-main">
        {activeTab === 'waiting' ? (
          <WaitingList
            books={waitingList}
            readingLog={readingLog}
            onAddBook={addToWaiting}
            onMoveToLog={moveToLog}
            onRemove={removeFromWaiting}
          />
        ) : (
          <ReadingLog books={readingLog} onUpdateReview={updateReview} onRemove={removeFromLog} />
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
