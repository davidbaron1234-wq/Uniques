"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { isDemoUser } from "@/lib/demo";

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
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  // Track whether we've already loaded from DB to avoid re-loading
  const dbLoaded = useRef(false);
  // Track last synced categories to avoid unnecessary PATCH calls
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    setPreferences(loadPreferences());
    setIsMounted(true);
  }, []);

  // Load interests from DB for real users (overrides localStorage)
  useEffect(() => {
    if (status === "loading" || dbLoaded.current) return;
    if (isDemoUser(session?.user?.email)) { dbLoaded.current = true; return; }
    if (!session?.user?.id) return;

    dbLoaded.current = true;
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { interests?: string[] } | null) => {
        if (!data?.interests?.length) return;
        const cats = data.interests;
        setPreferences((prev) => ({ ...prev, favoriteCategories: cats }));
        lastSyncedRef.current = JSON.stringify(cats);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ favoriteCategories: cats })); } catch {}
      })
      .catch(() => {});
  }, [status, session?.user?.email, session?.user?.id]);

  // Persist to localStorage whenever preferences change
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch {}
    }
  }, [preferences, isMounted]);

  // Sync changed categories to DB for real users (debounced via ref comparison)
  useEffect(() => {
    if (!isMounted || !dbLoaded.current) return;
    if (isDemoUser(session?.user?.email) || !session?.user?.id) return;

    const cats = preferences.favoriteCategories;
    const serialized = JSON.stringify(cats);
    if (serialized === lastSyncedRef.current) return;
    lastSyncedRef.current = serialized;

    fetch("/api/profile", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ interests: cats }),
    }).catch(() => {});
  }, [preferences.favoriteCategories, isMounted, session?.user?.email, session?.user?.id]);

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
