import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'dalits-price-tracker';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { trackedBooks: [] };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function usePriceTracker() {
  const [data, setData] = useState(loadData);
  const checkingRef = useRef(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // On mount: check prices for books not checked in 24+ hours
  useEffect(() => {
    if (checkingRef.current) return;
    checkingRef.current = true;

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

        setData((prev) => ({
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

  function addTrackedBook(book) {
    setData((prev) => {
      const already = prev.trackedBooks.some((b) => b.id === book.id);
      if (already) return prev;
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
    setData((prev) => ({
      ...prev,
      trackedBooks: prev.trackedBooks.filter((b) => b.id !== id),
    }));
  }

  function dismissNotification(id) {
    setData((prev) => ({
      ...prev,
      trackedBooks: prev.trackedBooks.map((b) =>
        b.id === id ? { ...b, priceChangedNotification: null } : b
      ),
    }));
  }

  const changesCount = data.trackedBooks.filter(
    (b) => b.priceChangedNotification !== null
  ).length;

  return {
    trackedBooks: data.trackedBooks,
    addTrackedBook,
    removeTrackedBook,
    dismissNotification,
    changesCount,
  };
}
