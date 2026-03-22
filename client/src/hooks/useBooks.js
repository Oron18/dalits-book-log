import { useState, useEffect } from 'react';

const STORAGE_KEY = 'dalits-book-log';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { waitingList: [], readingLog: [] };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function useBooks() {
  const [data, setData] = useState(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  function addToWaiting(book) {
    setData((prev) => {
      const already = prev.waitingList.some((b) => b.id === book.id) ||
        prev.readingLog.some((b) => b.id === book.id);
      if (already) return prev;
      return { ...prev, waitingList: [book, ...prev.waitingList] };
    });
  }

  function moveToLog(bookId) {
    setData((prev) => {
      const book = prev.waitingList.find((b) => b.id === bookId);
      if (!book) return prev;
      const alreadyInLog = prev.readingLog.some((b) => b.id === bookId);
      if (alreadyInLog) return prev;
      return {
        waitingList: prev.waitingList.filter((b) => b.id !== bookId),
        readingLog: [{ ...book, review: '', dateAdded: new Date().toISOString() }, ...prev.readingLog],
      };
    });
  }

  function updateReview(bookId, review) {
    setData((prev) => ({
      ...prev,
      readingLog: prev.readingLog.map((b) =>
        b.id === bookId ? { ...b, review } : b
      ),
    }));
  }

  function removeFromWaiting(bookId) {
    setData((prev) => ({
      ...prev,
      waitingList: prev.waitingList.filter((b) => b.id !== bookId),
    }));
  }

  function removeFromLog(bookId) {
    setData((prev) => ({
      ...prev,
      readingLog: prev.readingLog.filter((b) => b.id !== bookId),
    }));
  }

  return {
    waitingList: data.waitingList,
    readingLog: data.readingLog,
    addToWaiting,
    moveToLog,
    updateReview,
    removeFromWaiting,
    removeFromLog,
  };
}
