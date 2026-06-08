"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("mactech-erp-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark-mode", nextDark);
    setDark(nextDark);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark-mode", nextDark);
    window.localStorage.setItem("mactech-erp-theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  }

  return (
    <button className="icon-button" type="button" onClick={toggleTheme} title="Cambiar modo">
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
