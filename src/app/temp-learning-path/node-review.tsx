"use client";

import { useMemo, useState } from "react";

interface ReviewQuestion {
  concept: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface NodeReviewProps {
  questions: ReviewQuestion[];
  mistakeLog: Record<string, number>;
  masteryLevel: Record<string, number>;
  onConcept: (concept: string, correct: boolean) => void;
  onComplete: () => void;
}

function selectQuestions(
  questions: ReviewQuestion[],
  mistakeLog: Record<string, number>,
  count = 5
): ReviewQuestion[] {
  const recent = questions.slice(-Math.ceil(count * 0.4));
  const highMistake = [...questions]
    .filter((q) => (mistakeLog[q.concept] ?? 0) > 0)
    .sort((a, b) => (mistakeLog[b.concept] ?? 0) - (mistakeLog[a.concept] ?? 0))
    .slice(0, Math.ceil(count * 0.4));
  const used = new Set([...recent, ...highMistake].map((q) => q.question));
  const random = questions
    .filter((q) => !used.has(q.question))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.ceil(count * 0.2));

  const pool = [...recent, ...highMistake, ...random];
  const seen = new Set<string>();
  const deduped: ReviewQuestion[] = [];
  for (const q of pool) {
    if (!seen.has(q.question)) { seen.add(q.question); deduped.push(q); }
  }
  while (deduped.length < count) {
    const fallback = questions.find((q) => !seen.has(q.question));
    if (!fallback) break;
    seen.add(fallback.question);
    deduped.push(fallback);
  }
  return deduped.slice(0, count);
}

export function NodeReview({ questions, mistakeLog, onConcept, onComplete }: NodeReviewProps) {
  const selected = useMemo(() => selectQuestions(questions, mistakeLog), [questions, mistakeLog]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const q = selected[index];

  function handleAnswer(optionIndex: number) {
    const correct = optionIndex === q.correctIndex;
    onConcept(q.concept, correct);
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => {
      setFeedback(null);
      if (index === selected.length - 1) onComplete();
      else setIndex((i) => i + 1);
    }, correct ? 700 : 1100);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Review
        </span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {index + 1} / {selected.length}
        </span>
      </div>

      <div style={{ height: 3, background: "var(--muted)", borderRadius: 2 }}>
        <div
          style={{
            height: "100%",
            width: `${(index / selected.length) * 100}%`,
            background: "var(--primary)",
            borderRadius: 2,
            transition: "width 300ms ease",
          }}
        />
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={feedback !== null}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor:
                feedback && i === q.correctIndex
                  ? "oklch(0.65 0.15 142)"
                  : "var(--border)",
              background:
                feedback && i === q.correctIndex
                  ? "oklch(0.45 0.15 142 / 15%)"
                  : "var(--card)",
              color: "var(--foreground)",
              fontSize: 14,
              textAlign: "left",
              cursor: feedback ? "default" : "pointer",
              transition: "all 150ms",
              opacity: feedback && i !== q.correctIndex ? 0.5 : 1,
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback === "wrong" && (
        <p style={{ fontSize: 12, color: "var(--destructive)", textAlign: "center" }}>
          Incorrect — the right answer is highlighted
        </p>
      )}
    </div>
  );
}
