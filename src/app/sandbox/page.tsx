"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AudioProvider, useAudioContext } from "@/providers/audio-provider";
import { ThemedSynthPanel } from "@/components/synths/themed-synth-panel";
import { useSynthEngine } from "@/hooks/use-synth-engine";
import { SYNTH_CONFIGS } from "@/components/synths/configs";
import type { EngineType } from "@/lib/synth-engine";

const CONFIG = SYNTH_CONFIGS["osci-mono"];

const NATURAL_W = 900;
const BASE_SCALE = 0.5;
const ZOOM_SCALE = 2.4;

const VARIANTS = [
  {
    id: "ease",
    name: "Ease",
    description: "Material smooth ease — 450ms",
    transition: "transform 450ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  {
    id: "spring",
    name: "Spring",
    description: "Overshoot bounce — 700ms",
    transition: "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Slow camera dolly — 1400ms",
    transition: "transform 1400ms cubic-bezier(0.25, 0.1, 0.1, 1)",
  },
  {
    id: "momentum",
    name: "Momentum",
    description: "Snap then drift — 900ms",
    transition: "transform 900ms cubic-bezier(0, 0.9, 0.1, 1)",
  },
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

function ZoomLab() {
  const { startAudio } = useAudioContext();
  const [variantId, setVariantId] = useState<VariantId>("ease");
  const [zoomTarget, setZoomTarget] = useState<{ fx: number; fy: number } | null>(null);
  const [naturalH, setNaturalH] = useState(620);

  const synthRef = useRef<HTMLDivElement>(null);

  const { params, isReady, setParam, noteOn, noteOff } = useSynthEngine({
    engineType: CONFIG.engineType,
    engineConfig: CONFIG.engineConfig,
    defaultParams: CONFIG.defaultParams,
    allParams: CONFIG.allParams,
  });

  // Measure natural height after first render
  useEffect(() => {
    if (synthRef.current) {
      setNaturalH(synthRef.current.offsetHeight);
    }
  }, []);

  // ESC to zoom out
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const variant = VARIANTS.find((v) => v.id === variantId)!;

  // Zoom-in: click on the synth overlay (base state only)
  // Uses getBoundingClientRect of the scaled synth to compute fx/fy fractions
  const handleZoomIn = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const synth = synthRef.current;
      if (!synth) return;

      const rect = synth.getBoundingClientRect();

      // Only fire if click lands inside the visual synth bounds
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) return;

      startAudio();

      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      setZoomTarget({ fx, fy });
    },
    [startAudio]
  );

  // Transform math:
  //   scale(S) translate(dx, dy) — CSS applies translate first in local space, then scale
  //   To bring fraction (fx, fy) of natural element to container centre:
  //     dx = (0.5 - fx) * NATURAL_W
  //     dy = (0.5 - fy) * NATURAL_H
  const synthTransform = zoomTarget
    ? `scale(${ZOOM_SCALE}) translate(${(0.5 - zoomTarget.fx) * NATURAL_W}px, ${(0.5 - zoomTarget.fy) * naturalH}px)`
    : `scale(${BASE_SCALE})`;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        color: "var(--foreground)",
        overflow: "hidden",
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          height: 44,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
          }}
        >
          Zoom Lab
        </span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span style={{ fontSize: 12 }}>{CONFIG.name}</span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          — {variant.description}
        </span>

        {zoomTarget && (
          <button
            onClick={() => setZoomTarget(null)}
            style={{
              marginLeft: "auto",
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted-foreground)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            zoom out  ×
          </button>
        )}
      </div>

      {/* ── Synth area ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* The synth — transforms applied here */}
        <div
          ref={synthRef}
          style={{
            width: NATURAL_W,
            flexShrink: 0,
            transformOrigin: "center center",
            transform: synthTransform,
            transition: variant.transition,
            cursor: zoomTarget ? "default" : undefined,
            // Allow pointer events through to controls when zoomed
            pointerEvents: zoomTarget ? "auto" : "none",
          }}
        >
          <ThemedSynthPanel
            engineType={CONFIG.engineType as EngineType}
            params={params}
            onParamChange={setParam}
            onNoteOn={(note) => {
              startAudio();
              noteOn(note, 0.8);
            }}
            onNoteOff={noteOff}
            unlockedParams={CONFIG.allParams}
            paramLessonMap={{}}
            isReady={isReady}
            synthName={CONFIG.name}
            synthSlug={CONFIG.slug}
            focusedGroup={null}
          />
        </div>

        {/* Transparent click overlay — only in base state.
            Captures clicks for zoom-in without interfering with controls. */}
        {!zoomTarget && (
          <div
            onClick={handleZoomIn}
            style={{
              position: "absolute",
              inset: 0,
              cursor: "zoom-in",
              zIndex: 10,
            }}
          />
        )}

        {/* Base state hint */}
        {!zoomTarget && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              fontSize: 11,
              color: "var(--muted-foreground)",
              pointerEvents: "none",
              letterSpacing: "0.08em",
            }}
          >
            click any section to zoom in · esc or button to zoom out
          </div>
        )}
      </div>

      {/* ── Variant selector ──────────────────────────────── */}
      <div
        style={{
          height: 60,
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            onClick={() => {
              setVariantId(v.id);
              setZoomTarget(null);
            }}
            style={{
              padding: "5px 14px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: variantId === v.id ? "var(--primary)" : "var(--border)",
              background: variantId === v.id ? "var(--primary)" : "transparent",
              color:
                variantId === v.id
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
          >
            {v.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SandboxPage() {
  return (
    <AudioProvider>
      <ZoomLab />
    </AudioProvider>
  );
}
