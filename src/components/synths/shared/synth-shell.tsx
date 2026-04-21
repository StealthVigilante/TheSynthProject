"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SynthShellProps {
  isMobile: boolean;
  theme: { bg: string; border: string; panel: string };
  header: ReactNode;
  controls: ReactNode;
  keyboard: ReactNode;
  navHeight?: number;
  desktopClassName?: string;
}

export function SynthShell({ isMobile, theme, header, controls, keyboard, navHeight = 0, desktopClassName }: SynthShellProps) {
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

  const desktopMinH = navHeight > 0 ? `calc(100dvh - ${navHeight}px)` : "100dvh";
  const desktopMaxH = navHeight > 0 ? `calc(100dvh - 4rem - ${navHeight}px)` : "calc(100dvh - 4rem)";

  return (
    <div
      className="flex items-center justify-center py-8"
      style={{ background: theme.bg, minHeight: desktopMinH }}
    >
      <div
        className={cn("flex flex-col rounded-xl overflow-hidden border shadow-2xl", desktopClassName ?? "w-[480px] lg:w-[520px]")}
        style={{ background: theme.panel, borderColor: theme.border, maxHeight: desktopMaxH }}
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
