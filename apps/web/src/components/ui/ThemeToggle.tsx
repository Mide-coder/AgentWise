"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Self-contained dark-mode toggle.
 * Does NOT depend on next-themes — reads/writes the `dark` class on <html>
 * directly via localStorage. This avoids any provider context issues.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read current theme from html class (set by next-themes or by us)
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div
        className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-9 h-9 rounded-xl flex items-center justify-center
                 bg-slate-100 hover:bg-slate-200
                 dark:bg-slate-700 dark:hover:bg-slate-600
                 border border-slate-300 dark:border-slate-500
                 transition-colors duration-150 cursor-pointer"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
      )}
    </button>
  );
}
