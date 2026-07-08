import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WATCHLIST_STORAGE_KEY,
  normalizeWatchlist,
  normalizeWatchlistItem,
} from '../utils/watchlistHelpers';

/**
 * Custom hook encapsulating all watchlist state and actions.
 * @param {function} addToast - toast callback for user feedback
 * @returns {object}
 */
export function useWatchlist(addToast) {
  const importInputRef = useRef(null);

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return normalizeWatchlist(JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY)) || []);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const watchlistTickers = useMemo(() => watchlist.map((item) => item.ticker), [watchlist]);

  const watchlistByTicker = useMemo(
    () => new Map(watchlist.map((item) => [item.ticker, item])),
    [watchlist],
  );

  const toggleWatchlist = useCallback((ticker) => {
    setWatchlist((currentWatchlist) => {
      const exists = currentWatchlist.some((item) => item.ticker === ticker);
      if (exists) return currentWatchlist.filter((item) => item.ticker !== ticker);
      return [...currentWatchlist, normalizeWatchlistItem(ticker)];
    });
  }, []);

  const updateWatchlistItem = useCallback((ticker, patch) => {
    setWatchlist((currentWatchlist) =>
      currentWatchlist.map((item) =>
        item.ticker === ticker ? normalizeWatchlistItem({ ...item, ...patch }) : item,
      ),
    );
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    addToast({ title: 'Watchlist cleared', message: 'All saved tickers were removed.' });
  }, [addToast]);

  const exportWatchlist = useCallback(() => {
    const payload = {
      app: 'IDX Monitor',
      exported_at: new Date().toISOString(),
      version: 2,
      watchlist,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'idx-monitor-watchlist.json';
    link.click();
    URL.revokeObjectURL(url);
    addToast({ title: 'Watchlist exported', message: `${watchlist.length} tickers saved to JSON.` });
  }, [addToast, watchlist]);

  const importWatchlist = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const importedWatchlist = Array.isArray(parsed) ? parsed : parsed.watchlist;
          const normalizedWatchlist = normalizeWatchlist(importedWatchlist);
          if (!normalizedWatchlist.length) return;

          setWatchlist(normalizedWatchlist);
          addToast({
            title: 'Watchlist imported',
            message: `${normalizedWatchlist.length} tickers loaded.`,
          });
        } catch {
          addToast({
            type: 'error',
            title: 'Import failed',
            message: 'Please select a valid watchlist JSON file.',
          });
        } finally {
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    },
    [addToast],
  );

  return {
    watchlist,
    watchlistTickers,
    watchlistByTicker,
    toggleWatchlist,
    updateWatchlistItem,
    clearWatchlist,
    exportWatchlist,
    importWatchlist,
    importInputRef,
  };
}
