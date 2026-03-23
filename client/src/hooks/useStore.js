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

// Merge two lists by id: primary items first, then any local-only items
function mergeById(primary, local) {
  const primaryIds = new Set((primary || []).map((b) => b.id));
  const localOnly = (local || []).filter((b) => !primaryIds.has(b.id));
  return [...(primary || []), ...localOnly];
}

export function useStore() {
  const [data, setData] = useState(loadLocal);
  const [lastSynced, setLastSynced] = useState(null);
  const serverAvailable = useRef(false);
  const saveTimer = useRef(null);
  const priceCheckDone = useRef(false);

  // On mount: merge server data with local data
  // If server is empty but local has data → push local to server (first-time sync)
  useEffect(() => {
    fetch('/api/store')
      .then((r) => r.json())
      .then((serverData) => {
        if (serverData.error || serverData._unconfigured) return;
        serverAvailable.current = true;

        const local = loadLocal();
        const merged = {
          waitingList: mergeById(serverData.waitingList, local.waitingList),
          readingLog: mergeById(serverData.readingLog, local.readingLog),
          trackedBooks: mergeById(serverData.trackedBooks, local.trackedBooks),
        };

        setData(merged);
        saveLocal(merged);
        setLastSynced(new Date());

        // If local had items the server didn't know about → push merged to server
        const serverTotal = (serverData.waitingList?.length || 0) +
                            (serverData.readingLog?.length || 0) +
                            (serverData.trackedBooks?.length || 0);
        const mergedTotal = merged.waitingList.length +
                            merged.readingLog.length +
                            merged.trackedBooks.length;
        if (mergedTotal > serverTotal) {
          fetch('/api/store', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          }).catch(() => {});
        }
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
              priceOriginal: updated.priceOriginal || b.priceOriginal || '',
              priceBargain: updated.priceBargain || b.priceBargain || '',
              priceClub: updated.priceClub || b.priceClub || '',
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
            priceOriginal: book.priceOriginal || '',
            priceBargain: book.priceBargain || '',
            priceClub: book.priceClub || '',
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

  async function refreshTrackedBook(id) {
    const book = data.trackedBooks.find((b) => b.id === id);
    if (!book) return;
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
          if (b.id !== id) return b;
          const priceChanged = newPrice && b.currentPrice && newPrice !== b.currentPrice;
          return {
            ...b,
            currentPrice: newPrice || b.currentPrice,
            priceOriginal: updated.priceOriginal || b.priceOriginal || '',
            priceBargain: updated.priceBargain || b.priceBargain || '',
            priceClub: updated.priceClub || b.priceClub || '',
            lastChecked: now,
            priceChangedNotification: priceChanged
              ? { from: b.currentPrice, to: newPrice, date: now }
              : b.priceChangedNotification,
          };
        }),
      }));
    } catch (_) {}
  }

  function dismissNotification(id) {
    update((prev) => ({
      ...prev,
      trackedBooks: prev.trackedBooks.map((b) =>
        b.id === id ? { ...b, priceChangedNotification: null } : b
      ),
    }));
  }

  // Force-push current local data to server (manual sync button)
  async function pushToServer() {
    const local = loadLocal();
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      });
      if (res.ok) {
        serverAvailable.current = true;
        setLastSynced(new Date());
        return true;
      }
    } catch (_) {}
    return false;
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
    refreshTrackedBook,
    dismissNotification,
    changesCount,
    // sync
    lastSynced,
    pushToServer,
  };
}
