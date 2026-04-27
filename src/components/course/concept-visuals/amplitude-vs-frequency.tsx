"use client";
import { motion } from "framer-motion";

export function AmplitudeVsFrequency({
  focus = "both",
}: {
  focus?: "amp" | "freq" | "both";
}) {
  const showAmp = focus !== "freq";
  const showFreq = focus !== "amp";
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {showAmp && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Amplitude</span>
          <svg viewBox="0 0 160 80" className="w-full h-20">
            <motion.path
              d="M 0 40 Q 40 10 80 40 T 160 40"
              stroke="var(--primary, #a78bfa)"
              strokeWidth="2"
              fill="none"
              animate={{ scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "center" }}
            />
          </svg>
        </div>
      )}
      {showFreq && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Frequency</span>
          <svg viewBox="0 0 160 80" className="w-full h-20">
            <motion.path
              stroke="var(--primary, #a78bfa)"
              strokeWidth="2"
              fill="none"
              animate={{
                d: [
                  "M 0 40 Q 20 10 40 40 T 80 40 T 120 40 T 160 40",
                  "M 0 40 Q 10 10 20 40 T 40 40 T 60 40 T 80 40 T 100 40 T 120 40 T 140 40 T 160 40",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
