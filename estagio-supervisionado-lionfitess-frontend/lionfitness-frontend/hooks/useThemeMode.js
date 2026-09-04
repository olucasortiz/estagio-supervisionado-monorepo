"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "lion-theme";
export const THEME_CHANGE_EVENT = "lion-theme-change";

export const themePalettes = {
  light: {
    background: "#f8fafc",
    card: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
  },
  dark: {
    background: "#0f172a",
    card: "#1e293b",
    text: "#f8fafc",
    muted: "#cbd5e1",
    border: "#334155",
  },
};

function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

export function useThemeMode() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  });

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        setTheme(normalizeTheme(event.newValue));
      }
    };

    const handleThemeChange = (event) => {
      setTheme(normalizeTheme(event.detail));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: nextTheme }));
    }
  }, [theme]);

  const isDark = theme === "dark";
  const themeStyles = useMemo(() => themePalettes[theme], [theme]);

  return {
    theme,
    isDark,
    toggleTheme,
    themeStyles,
  };
}
