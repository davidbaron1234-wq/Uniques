"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const STORAGE_KEY = "uniques_user_preferences";

export interface UserPreferences {
  favoriteCategories: string[];
}

interface PreferencesContextValue {
  preferences: UserPreferences;
  setFavoriteCategories: (cats: string[]) => void;
  toggleFavoriteCategory: (cat: string) => void;
}

const DEFAULT_PREFERENCES: UserPreferences = { favoriteCategories: [] };

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return DEFAULT_PREFERENCES;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPreferences(loadPreferences());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch {}
    }
  }, [preferences, isMounted]);

  const setFavoriteCategories = useCallback((cats: string[]) => {
    setPreferences((prev) => ({ ...prev, favoriteCategories: cats }));
  }, []);

  const toggleFavoriteCategory = useCallback((cat: string) => {
    setPreferences((prev) => ({
      ...prev,
      favoriteCategories: prev.favoriteCategories.includes(cat)
        ? prev.favoriteCategories.filter((c) => c !== cat)
        : [...prev.favoriteCategories, cat],
    }));
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, setFavoriteCategories, toggleFavoriteCategory }}>
      {children}
    </PreferencesContext.Provider>
  );
}
