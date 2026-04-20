"use client";

import type { ReactNode } from "react";

interface SynthShellProps {
  isMobile: boolean;
  theme: { bg: string; border: string; panel: string };
  header: ReactNode;
  controls: ReactNode;
  keyboard: ReactNode;
}

export function SynthShell({ isMobile, theme, header, controls, keyboard }: SynthShellProps) {
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: theme.bg }}
      >
        <div
          style={{
            position: "absolute",
            width: "100dvh",
            height: "100dvw",
            top: "50%",
            left: "50%",
            marginTop: "calc(-50dvw)",
            marginLeft: "calc(-50dvh)",
            transform: "rotate(-90deg)",
            transformOrigin: "center center",
            display: "flex",
            flexDirection: "column",
            background: theme.panel,
            overflow: "hidden",
          }}
        >
          <div style={{ flexShrink: 0 }}>{header}</div>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{controls}</div>
          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${theme.border}`,
              background: theme.panel,
            }}
          >
            {keyboard}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8"
      style={{ background: theme.bg }}
    >
      <div
        className="w-[480px] lg:w-[520px] flex flex-col max-h-[calc(100vh-4rem)] rounded-xl overflow-hidden border shadow-2xl"
        style={{ background: theme.panel, borderColor: theme.border }}
      >
        <div className="flex-shrink-0">{header}</div>
        <div className="flex-1 min-h-0 overflow-y-auto">{controls}</div>
        <div
          className="flex-shrink-0 border-t"
          style={{ borderColor: theme.border, background: theme.panel }}
        >
          {keyboard}
        </div>
      </div>
    </div>
  );
}
