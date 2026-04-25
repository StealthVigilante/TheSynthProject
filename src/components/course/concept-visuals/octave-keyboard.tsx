"use client";
import { motion } from "framer-motion";

const WHITE = ["C", "D", "E", "F", "G", "A", "B"];

export function OctaveKeyboard({ highlightC = true, octaves = 2 }: { highlightC?: boolean; octaves?: number }) {
  const total = WHITE.length * octaves;
  return (
    <div className="flex w-full h-24 gap-px">
      {Array.from({ length: total }, (_, i) => {
        const note = WHITE[i % WHITE.length];
        const oct = Math.floor(i / WHITE.length);
        const isC = note === "C";
        return (
          <motion.div
            key={i}
            className="flex-1 bg-card border border-border rounded-b text-[10px] text-muted-foreground flex items-end justify-center pb-1"
            style={{
              backgroundColor: isC && highlightC ? "var(--primary, #a78bfa)" : undefined,
              color: isC && highlightC ? "white" : undefined,
            }}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            {isC ? `${note}${oct + 3}` : note}
          </motion.div>
        );
      })}
    </div>
  );
}
