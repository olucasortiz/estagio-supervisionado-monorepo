"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function applyThemeToDOM(theme, isLoginPage) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (isLoginPage) {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    return;
  }

  const isDark = theme === "dark";
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", isDark ? "dark" : "light");
}

export function useThemeMode() {
  let pathname = null;
  try {
    pathname = usePathname();
  } catch {
    pathname = null;
  }

  const isLoginPage = typeof pathname === "string" && pathname.startsWith("/login");
  const [theme, setTheme] = useState(getInitialTheme);

  // Aplica o tema na raiz DOM e reaplica ao mudar de rota ou tema
  useEffect(() => {
    applyThemeToDOM(theme, isLoginPage);
  }, [theme, isLoginPage]);

  // Sincronização entre abas e componentes da mesma página
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

  const setExplicitTheme = useCallback((newTheme) => {
    const normalized = normalizeTheme(newTheme);
    setTheme(normalized);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: normalized }));
    }
  }, []);

  const isDark = theme === "dark";
  const themeStyles = useMemo(() => themePalettes[theme], [theme]);

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme: setExplicitTheme,
    themeStyles,
  };
}

export default useThemeMode;
