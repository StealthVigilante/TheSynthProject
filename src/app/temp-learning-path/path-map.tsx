"use client";

import { BookOpen, Star, Ear, Lock, Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type NodeType = "lesson" | "review" | "create";
export type NodeStatus = "locked" | "available" | "completed";

export interface PathNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle?: string;
  status: NodeStatus;
}

export interface Phase {
  id: string;
  label: string;
  nodes: PathNode[];
  milestone: string;
}

interface PathMapProps {
  phases: Phase[];
  activeNodeId: string | null;
  completedNodes: Set<string>;
  onNodeClick: (id: string) => void;
  renderPanel: (nodeId: string) => ReactNode;
}

const NODE_ICONS: Record<NodeType, typeof BookOpen> = {
  lesson: BookOpen,
  review: Star,
  create: Ear,
};

export function PathMap({ phases, activeNodeId, completedNodes, onNodeClick, renderPanel }: PathMapProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, paddingBottom: 80 }}>
      {phases.map((phase, pi) => {
        const allDone = phase.nodes.every((n) => completedNodes.has(n.id));
        return (
          <div key={phase.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 400 }}>
            {/* Phase header */}
            <div
              style={{
                margin: pi === 0 ? "8px 0 20px" : "32px 0 20px",
                padding: "4px 14px",
                borderRadius: 20,
                background: "var(--muted)",
                border: "1px solid var(--border)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
              }}
            >
              Phase {pi + 1} — {phase.label}
            </div>

            {/* Nodes */}
            {phase.nodes.map((node, ni) => {
              const isFirst = ni === 0;
              const isActive = activeNodeId === node.id;
              const isDone = completedNodes.has(node.id);

              return (
                <div key={node.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                  {/* Connector above */}
                  {!isFirst && (
                    <div
                      style={{
                        width: 2,
                        height: 24,
                        background: isDone || completedNodes.has(phase.nodes[ni - 1].id) ? "var(--primary)" : "var(--border)",
                        transition: "background 400ms",
                      }}
                    />
                  )}

                  {/* Node card */}
                  <NodeCard
                    node={node}
                    isActive={isActive}
                    isDone={isDone}
                    onClick={() => node.status !== "locked" && onNodeClick(node.id)}
                  />

                  {/* Inline panel */}
                  {isActive && (
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 380,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 20,
                        marginTop: 8,
                      }}
                    >
                      {renderPanel(node.id)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Milestone */}
            {allDone && (
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 20px",
                  borderRadius: 20,
                  background: "oklch(0.45 0.15 142 / 12%)",
                  border: "1px solid oklch(0.65 0.15 142 / 40%)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "oklch(0.75 0.15 142)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "fadeIn 600ms ease",
                }}
              >
                <Check size={14} />
                {phase.milestone}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function NodeCard({
  node,
  isActive,
  isDone,
  onClick,
}: {
  node: PathNode;
  isActive: boolean;
  isDone: boolean;
  onClick: () => void;
}) {
  const Icon = NODE_ICONS[node.type];
  const locked = node.status === "locked";

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        width: "100%",
        maxWidth: 360,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid",
        borderColor: isActive
          ? "var(--primary)"
          : isDone
          ? "oklch(0.65 0.15 142 / 35%)"
          : "var(--border)",
        background: isActive
          ? "oklch(from var(--primary) l c h / 5%)"
          : isDone
          ? "oklch(0.45 0.15 142 / 8%)"
          : "var(--card)",
        opacity: locked ? 0.45 : 1,
        cursor: locked ? "not-allowed" : "pointer",
        transition: "all 200ms",
        textAlign: "left",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDone
            ? "oklch(0.45 0.15 142 / 20%)"
            : isActive
            ? "oklch(from var(--primary) l c h / 12%)"
            : "var(--muted)",
          color: isDone ? "oklch(0.65 0.15 142)" : isActive ? "var(--primary)" : "var(--muted-foreground)",
        }}
      >
        {isDone ? <Check size={16} /> : locked ? <Lock size={14} /> : <Icon size={16} />}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{node.title}</p>
        {node.subtitle && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{node.subtitle}</p>
        )}
      </div>

      {!locked && !isDone && (
        <ChevronRight size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      )}
    </button>
  );
}
