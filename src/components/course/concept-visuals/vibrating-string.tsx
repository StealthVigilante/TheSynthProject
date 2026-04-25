"use client";
import { motion } from "framer-motion";

export function VibratingString({ frequency = 1 }: { frequency?: number }) {
  return (
    <svg viewBox="0 0 320 120" className="w-full h-32">
      <motion.path
        d="M 10 60 Q 80 60 80 60 Q 160 60 160 60 Q 240 60 240 60 Q 310 60 310 60"
        stroke="var(--primary, #a78bfa)"
        strokeWidth="3"
        fill="none"
        animate={{
          d: [
            "M 10 60 Q 80 30 160 60 Q 240 90 310 60",
            "M 10 60 Q 80 90 160 60 Q 240 30 310 60",
            "M 10 60 Q 80 30 160 60 Q 240 90 310 60",
          ],
        }}
        transition={{ duration: 1 / frequency, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="10" cy="60" r="6" fill="var(--muted-foreground, #71717a)" />
      <circle cx="310" cy="60" r="6" fill="var(--muted-foreground, #71717a)" />
    </svg>
  );
}
