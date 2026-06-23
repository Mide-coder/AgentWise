"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a placeholder with same size so layout doesn't shift
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-9 h-9 rounded-xl flex items-center justify-center
                 border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-surface-800
                 hover:bg-slate-100 dark:hover:bg-slate-700
                 transition-colors duration-150"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-slate-500" aria-hidden="true" />
      )}
    </button>
  );
}
