"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Check, Lock, Play } from "lucide-react";

interface PathwayNode {
  lessonId: string;
  lessonSlug: string;
  title: string;
  description: string | null;
  xpReward: number;
  status: "locked" | "available" | "in_progress" | "completed";
  unlocksParams: string[];
}

interface PathwayMapProps {
  synthSlug: string;
  nodes: PathwayNode[];
}

export function PathwayMap({ synthSlug, nodes }: PathwayMapProps) {
  return (
    <div className="flex flex-col items-center gap-0">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1;

        return (
          <div key={node.lessonId} className="flex flex-col items-center">
            {/* Connector line */}
            {i > 0 && (
              <div
                className={cn(
                  "h-8 w-0.5",
                  node.status === "locked"
                    ? "bg-muted"
                    : "bg-primary"
                )}
              />
            )}

            {/* Node */}
            <PathwayNodeCard
              node={node}
              synthSlug={synthSlug}
            />

            {/* Connector line below */}
            {!isLast && (
              <div
                className={cn(
                  "h-8 w-0.5",
                  node.status === "completed"
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PathwayNodeCard({
  node,
  synthSlug,
}: {
  node: PathwayNode;
  synthSlug: string;
}) {
  const isClickable = node.status === "available" || node.status === "in_progress" || node.status === "completed";

  const content = (
    <div
      className={cn(
        "flex w-64 items-center gap-3 rounded-xl border p-4 transition-all",
        node.status === "completed" && "border-primary/50 bg-primary/5",
        node.status === "available" && "border-primary bg-card shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20",
        node.status === "in_progress" && "border-primary bg-card shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20",
        node.status === "locked" && "border-border bg-card opacity-50"
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          node.status === "completed" && "bg-primary text-primary-foreground",
          node.status === "available" && "bg-primary/10 text-primary",
          node.status === "in_progress" && "bg-primary/10 text-primary",
          node.status === "locked" && "bg-muted text-muted-foreground"
        )}
      >
        {node.status === "completed" && <Check className="h-5 w-5" />}
        {(node.status === "available" || node.status === "in_progress") && (
          <Play className="h-5 w-5" />
        )}
        {node.status === "locked" && <Lock className="h-4 w-4" />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{node.title}</p>
        {node.description && (
          <p className="text-xs text-muted-foreground truncate">
            {node.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            +{node.xpReward} XP
          </span>
          {node.unlocksParams.length > 0 && (
            <span className="text-xs text-primary/70">
              Unlocks {node.unlocksParams.length} param{node.unlocksParams.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link href={`/learn/${synthSlug}/${node.lessonSlug}`}>
        {content}
      </Link>
    );
  }

  return content;
}
