import { useCallback, useEffect, useState } from 'react';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '../utils/watchlistHelpers';

/**
 * Custom hook encapsulating settings state and persistence.
 * @returns {{ settings: object, updateSettings: function }}
 */
export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((nextSettings) => {
    setSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
  }, []);

  return { settings, updateSettings };
}
