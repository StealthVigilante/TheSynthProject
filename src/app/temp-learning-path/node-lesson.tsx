"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WaveformCanvas } from "./visuals";

export interface VisualSlide {
  type: "visual";
  title: string;
  body: string;
  visual?: "waveform" | "static-sine" | "static-square" | "static-triangle" | "static-saw";
}

export interface McSlide {
  type: "mc";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type Slide = VisualSlide | McSlide;

interface NodeLessonProps {
  slides: Slide[];
  getWaveform: () => Float32Array;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

export function NodeLesson({ slides, getWaveform, onConcept, onComplete }: NodeLessonProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function handleAnswer(optionIndex: number) {
    if (slide.type !== "mc") return;
    const correct = optionIndex === slide.correctIndex;
    setFeedback(correct ? "correct" : "wrong");
    onConcept(slide.question, correct);
    if (correct) {
      setTimeout(() => {
        setFeedback(null);
        if (isLast) onComplete();
        else setIndex((i) => i + 1);
      }, 700);
    } else {
      setTimeout(() => setFeedback(null), 900);
    }
  }

  function handleNext() {
    if (isLast) onComplete();
    else setIndex((i) => i + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i <= index ? "var(--primary)" : "var(--border)",
              transition: "background 200ms",
            }}
          />
        ))}
      </div>

      {/* Visual slide */}
      {slide.type === "visual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{slide.title}</p>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{slide.body}</p>
          {slide.visual === "waveform" && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <WaveformCanvas getWaveform={getWaveform} width={280} height={80} />
            </div>
          )}
          {(slide.visual === "static-sine" || slide.visual === "static-square" || slide.visual === "static-triangle" || slide.visual === "static-saw") && (
            <StaticWaveform type={slide.visual.replace("static-", "") as "sine" | "square" | "triangle" | "saw"} />
          )}
          <Button onClick={handleNext} className="w-full">
            {isLast ? "Complete" : "Continue →"}
          </Button>
        </div>
      )}

      {/* MC slide */}
      {slide.type === "mc" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{slide.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slide.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={feedback === "correct"}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    feedback === "correct" && i === slide.correctIndex
                      ? "var(--primary)"
                      : "var(--border)",
                  background:
                    feedback === "correct" && i === slide.correctIndex
                      ? "oklch(0.45 0.15 142 / 20%)"
                      : "var(--card)",
                  color: "var(--foreground)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: feedback === "correct" ? "default" : "pointer",
                  transition: "all 150ms",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {feedback === "wrong" && (
            <p style={{ fontSize: 12, color: "var(--destructive)", textAlign: "center" }}>
              Not quite — try again
            </p>
          )}
          {feedback === "correct" && (
            <p style={{ fontSize: 12, color: "oklch(0.65 0.15 142)", textAlign: "center" }}>
              Correct! ✓ &nbsp;{(slide as McSlide).explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Static waveform SVGs for lesson illustrations
function StaticWaveform({ type }: { type: "sine" | "square" | "triangle" | "saw" }) {
  const W = 280;
  const H = 70;
  const mid = H / 2;
  const amp = H / 2 - 8;
  const cycles = 2.5;
  const N = 200;

  let pathD = "";
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * cycles * Math.PI * 2;
    let y: number;
    if (type === "sine") {
      y = mid - Math.sin(t) * amp;
    } else if (type === "square") {
      y = mid - (Math.sin(t) >= 0 ? 1 : -1) * amp;
    } else if (type === "triangle") {
      y = mid - (2 / Math.PI) * Math.asin(Math.sin(t)) * amp;
    } else {
      const phase = ((t / (Math.PI * 2)) % 1);
      y = mid - (1 - 2 * phase) * amp;
    }
    const x = (i / N) * W;
    pathD += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={W} height={H} style={{ background: "var(--muted)", borderRadius: 8, border: "1px solid var(--border)" }}>
        <line x1={0} y1={mid} x2={W} y2={mid} stroke="var(--border)" strokeWidth={1} />
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
