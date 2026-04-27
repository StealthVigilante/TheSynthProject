"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Star, Swords } from "lucide-react";

export interface PathwayNode {
  lessonSlug: string;        // "1-1-1" or "test"
  lessonId: string;          // "1-1.1-1-1" or "1-1.test"
  title: string;
  status: "locked" | "available" | "completed";
  isTest?: boolean;
}

interface Props {
  unitSlug: string;
  subSlug: string;
  nodes: PathwayNode[];
}

const COLUMNS = [60, 140, 220, 140]; // x positions (snake)
const ROW_GAP = 90;

export function SnakePathway({ unitSlug, subSlug, nodes }: Props) {
  const positions = nodes.map((_, i) => ({
    x: COLUMNS[i % COLUMNS.length],
    y: 60 + i * ROW_GAP,
  }));
  const height = 60 + nodes.length * ROW_GAP;

  return (
    <div className="relative mx-auto" style={{ width: 280, height }}>
      <svg className="absolute inset-0" width={280} height={height}>
        {positions.slice(0, -1).map((p, i) => {
          const next = positions[i + 1];
          const completed = nodes[i].status === "completed";
          return (
            <motion.path
              key={i}
              d={`M ${p.x} ${p.y} Q ${(p.x + next.x) / 2} ${(p.y + next.y) / 2 + 30} ${next.x} ${next.y}`}
              stroke={completed ? "var(--primary, #a78bfa)" : "var(--muted, #27272a)"}
              strokeWidth={3}
              strokeDasharray={completed ? "0" : "6 6"}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            />
          );
        })}
      </svg>
      {nodes.map((node, i) => {
        const p = positions[i];
        return (
          <PathwayNodeView
            key={node.lessonId}
            node={node}
            unitSlug={unitSlug}
            subSlug={subSlug}
            x={p.x}
            y={p.y}
            index={i}
          />
        );
      })}
    </div>
  );
}

function PathwayNodeView({
  node, unitSlug, subSlug, x, y, index,
}: {
  node: PathwayNode; unitSlug: string; subSlug: string; x: number; y: number; index: number;
}) {
  // Inner is intentionally redeclared per render so it closes over index/x/y for the per-node animation.
  const Inner = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center border-2 ${
        node.status === "completed"
          ? "bg-primary border-primary text-primary-foreground"
          : node.status === "available"
            ? node.isTest
              ? "bg-red-600 border-amber-400 text-white shadow-lg shadow-red-500/30"
              : "bg-card border-primary text-primary shadow-lg shadow-primary/20"
            : "bg-card border-border text-muted-foreground"
      }`}
      style={{ left: x, top: y }}
      whileHover={{ scale: node.status === "locked" ? 1 : 1.06 }}
    >
      {node.status === "completed" ? <Check className="w-5 h-5" />
        : node.status === "locked" ? <Lock className="w-4 h-4" />
        : node.isTest ? <Swords className="w-5 h-5" />
        : <Star className="w-5 h-5" />}
    </motion.div>
  );

  if (node.status === "locked") {
    // eslint-disable-next-line react-hooks/static-components -- intentional, see comment on Inner
    return <Inner />;
  }
  return (
    <Link
      href={`/learn/${unitSlug}/${subSlug}/${node.lessonSlug}`}
      aria-label={node.title}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- intentional, see comment on Inner */}
      <Inner />
    </Link>
  );
}
