"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SYNTHS = [
  { n: 1, label: "The Starter" },
  { n: 2, label: "The Learner" },
  { n: 3, label: "The Classic" },
  { n: 4, label: "The Producer" },
  { n: 5, label: "The Lab" },
];

export default function TempSynthsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Sticky nav */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 48,
          background: "var(--background)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          overflowX: "auto",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
            marginRight: 4,
          }}
        >
          Synth Lab
        </span>
        {SYNTHS.map(({ n, label }) => {
          const href = `/temp-synths/${n}`;
          const active = pathname === href;
          return (
            <Link
              key={n}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: active ? "var(--primary)" : "var(--border)",
                background: active ? "oklch(from var(--primary) l c h / 8%)" : "var(--card)",
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "all 150ms",
              }}
            >
              <span style={{ fontSize: 10, opacity: 0.6 }}>{n}</span>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
