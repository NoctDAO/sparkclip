import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "default-feed-tab";

export type FeedTab = "foryou" | "following";

export function useFeedPreference() {
  const [defaultTab, setDefaultTab] = useState<FeedTab>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === "following" ? "following" : "foryou") as FeedTab;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, defaultTab);
  }, [defaultTab]);

  const setTab = useCallback((tab: FeedTab) => {
    setDefaultTab(tab);
  }, []);

  return { defaultTab, setDefaultTab: setTab };
}
