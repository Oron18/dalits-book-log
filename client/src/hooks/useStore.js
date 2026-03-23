import { useState, useEffect, useRef } from 'react';

const LOCAL_KEY_BOOKS = 'dalits-book-log';
const LOCAL_KEY_PRICES = 'dalits-price-tracker';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadLocal() {
  try {
    const books = JSON.parse(localStorage.getItem(LOCAL_KEY_BOOKS) || '{}');
    const prices = JSON.parse(localStorage.getItem(LOCAL_KEY_PRICES) || '{}');
    return {
      waitingList: books.waitingList || [],
      readingLog: books.readingLog || [],
      trackedBooks: prices.trackedBooks || [],
    };
  } catch (_) {
    return { waitingList: [], readingLog: [], trackedBooks: [] };
  }
}

function saveLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY_BOOKS, JSON.stringify({
      waitingList: data.waitingList,
      readingLog: data.readingLog,
    }));
    localStorage.setItem(LOCAL_KEY_PRICES, JSON.stringify({
      trackedBooks: data.trackedBooks,
    }));
  } catch (_) {}
}

export function useStore() {
  const [data, setData] = useState(loadLocal);
  const serverAvailable = useRef(false);
  const saveTimer = useRef(null);
  const priceCheckDone = useRef(false);

  // On mount: load from server (source of truth)
  useEffect(() => {
    fetch('/api/store')
      .then((r) => r.json())
      .then((serverData) => {
        if (serverData.error || serverData._unconfigured) return;
        serverAvailable.current = true;
        setData({
          waitingList: serverData.waitingList || [],
          readingLog: serverData.readingLog || [],
          trackedBooks: serverData.trackedBooks || [],
        });
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Price check on mount: books not checked in 24+ hours
  useEffect(() => {
    if (priceCheckDone.current) return;
    priceCheckDone.current = true;

    const stale = data.trackedBooks.filter((b) => {
      if (!b.lastChecked) return true;
      return Date.now() - new Date(b.lastChecked).getTime() >= CHECK_INTERVAL_MS;
    });

    if (stale.length === 0) return;

    stale.forEach(async (book) => {
      try {
        const res = await fetch(`/api/book?url=${encodeURIComponent(book.productUrl)}`);
        if (!res.ok) return;
        const updated = await res.json();
        if (updated.error) return;

        const newPrice = updated.price || '';
        const now = new Date().toISOString();

        update((prev) => ({
          ...prev,
          trackedBooks: prev.trackedBooks.map((b) => {
            if (b.id !== book.id) return b;
            const priceChanged = newPrice && b.currentPrice && newPrice !== b.currentPrice;
            return {
              ...b,
              currentPrice: newPrice || b.currentPrice,
              lastChecked: now,
              priceChangedNotification: priceChanged
                ? { from: b.currentPrice, to: newPrice, date: now }
                : b.priceChangedNotification,
            };
          }),
        }));
      } catch (_) {}
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(updater) {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveLocal(next);
      if (serverAvailable.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          fetch('/api/store', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
          }).catch(() => {});
        }, 800);
      }
      return next;
    });
  }

  // ── Books (waiting list + reading log) ────────────────────────

  function addToWaiting(book) {
    update((prev) => {
      const already = prev.waitingList.some((b) => b.id === book.id) ||
        prev.readingLog.some((b) => b.id === book.id);
      if (already) return prev;
      return { ...prev, waitingList: [book, ...prev.waitingList] };
    });
  }

  function moveToLog(bookId) {
    update((prev) => {
      const book = prev.waitingList.find((b) => b.id === bookId);
      if (!book) return prev;
      if (prev.readingLog.some((b) => b.id === bookId)) return prev;
      return {
        ...prev,
        waitingList: prev.waitingList.filter((b) => b.id !== bookId),
        readingLog: [{ ...book, review: '', dateAdded: new Date().toISOString() }, ...prev.readingLog],
      };
    });
  }

  function updateReview(bookId, review) {
    update((prev) => ({
      ...prev,
      readingLog: prev.readingLog.map((b) => b.id === bookId ? { ...b, review } : b),
    }));
  }

  function removeFromWaiting(bookId) {
    update((prev) => ({ ...prev, waitingList: prev.waitingList.filter((b) => b.id !== bookId) }));
  }

  function removeFromLog(bookId) {
    update((prev) => ({ ...prev, readingLog: prev.readingLog.filter((b) => b.id !== bookId) }));
  }

  function moveBackToWaiting(bookId) {
    update((prev) => {
      const book = prev.readingLog.find((b) => b.id === bookId);
      if (!book) return prev;
      const { review, dateAdded, ...bookData } = book;
      return {
        ...prev,
        waitingList: [bookData, ...prev.waitingList],
        readingLog: prev.readingLog.filter((b) => b.id !== bookId),
      };
    });
  }

  // ── Price tracker ─────────────────────────────────────────────

  function addTrackedBook(book) {
    update((prev) => {
      if (prev.trackedBooks.some((b) => b.id === book.id)) return prev;
      return {
        ...prev,
        trackedBooks: [
          {
            id: book.id,
            title: book.title,
            author: book.author || '',
            imageUrl: book.imageUrl || '',
            productUrl: book.productUrl,
            currentPrice: book.price || '',
            lastChecked: new Date().toISOString(),
            priceChangedNotification: null,
          },
          ...prev.trackedBooks,
        ],
      };
    });
  }

  function removeTrackedBook(id) {
    update((prev) => ({ ...prev, trackedBooks: prev.trackedBooks.filter((b) => b.id !== id) }));
  }

  function dismissNotification(id) {
    update((prev) => ({
      ...prev,
      trackedBooks: prev.trackedBooks.map((b) =>
        b.id === id ? { ...b, priceChangedNotification: null } : b
      ),
    }));
  }

  const changesCount = data.trackedBooks.filter((b) => b.priceChangedNotification !== null).length;

  return {
    // books
    waitingList: data.waitingList,
    readingLog: data.readingLog,
    addToWaiting,
    moveToLog,
    updateReview,
    removeFromWaiting,
    removeFromLog,
    moveBackToWaiting,
    // price tracker
    trackedBooks: data.trackedBooks,
    addTrackedBook,
    removeTrackedBook,
    dismissNotification,
    changesCount,
  };
}
