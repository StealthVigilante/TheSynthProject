"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "swiss-light"
  | "swiss-dark"
  | "brutalist-light"
  | "brutalist-dark";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  family: "Swiss" | "Brutalist";
  mode: "light" | "dark";
  /** Small color swatch shown in the picker */
  swatch: string;
  accent: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "swiss-light",     label: "Swiss",           family: "Swiss",     mode: "light", swatch: "#f8f7f5", accent: "#cc0000" },
  { id: "swiss-dark",      label: "Swiss Dark",      family: "Swiss",     mode: "dark",  swatch: "#141414", accent: "#ff2200" },
  { id: "brutalist-light", label: "Brutalist",       family: "Brutalist", mode: "light", swatch: "#f0ebe2", accent: "#dd1100" },
  { id: "brutalist-dark",  label: "Brutalist Dark",  family: "Brutalist", mode: "dark",  swatch: "#080808", accent: "#e8cc00" },
];

const STORAGE_KEY = "osciscoops-theme";
const DEFAULT: ThemeId = "swiss-dark";

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Context = createContext<ThemeCtx>({ theme: DEFAULT, setTheme: () => {} });

function applyTheme(id: ThemeId) {
  const isDark = id === "swiss-dark" || id === "brutalist-dark";
  const el = document.documentElement;
  el.setAttribute("data-theme", id);
  if (isDark) {
    el.classList.add("dark");
  } else {
    el.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const resolved =
      stored && THEMES.find((t) => t.id === stored) ? stored : DEFAULT;
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  return <Context.Provider value={{ theme, setTheme }}>{children}</Context.Provider>;
}

export function useTheme() {
  return useContext(Context);
}
