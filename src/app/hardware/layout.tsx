"use client";

import Link from "next/link";
import { ThemeProvider, useTheme, THEMES } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

function HardwareHeader() {
  const { theme, setTheme } = useTheme();
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 48, display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/dashboard" style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>
          ← App
        </Link>
        <div style={{ height: 16, width: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 11, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Hardware
        </span>
        <div style={{ flex: 1 }} />
        {/* Inline theme switcher */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.label}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px",
                background: theme === t.id ? "var(--primary)" : "transparent",
                color: theme === t.id ? "var(--primary-foreground)" : "var(--muted-foreground)",
                border: "1px solid var(--border)",
                fontSize: 9, fontWeight: 700, cursor: "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "inherit",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.swatch, border: "1px solid var(--border)", flexShrink: 0 }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function HardwareLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <HardwareHeader />
      <main>{children}</main>
    </div>
  );
}

export default function HardwareLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HardwareLayoutInner>{children}</HardwareLayoutInner>
    </ThemeProvider>
  );
}
