"use client";

import { useRouter } from "next/navigation";
import { useRunStore } from "@/store/run-store";
import { cn } from "@/lib/utils";
import { IconX, IconLoader2, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

export function RunMonitor() {
  const router = useRouter();
  const { activeRun, clearActiveRun } = useRunStore();

  if (!activeRun) return null;

  const isRunning   = activeRun.status === "running" || activeRun.status === "pending";
  const isCompleted = activeRun.status === "completed";
  const isFailed    = activeRun.status === "failed";
  const isCancelled = activeRun.status === "cancelled";

  const handleClick = () => {
    if (isCompleted) {
      router.push(`/results/${activeRun.runId}`);
    } else if (isRunning) {
      router.push(`/playground`);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted || isFailed || isCancelled) clearActiveRun();
  };

  const pct = Math.round((activeRun.progress ?? 0) * 100);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "fixed bottom-5 right-5 z-[9999] w-[300px] rounded-lg border border-border",
        "bg-card shadow-lg cursor-pointer select-none",
        "transition-all duration-200",
        isRunning   && "border-border",
        isCompleted && "border-[var(--signal-green)]/40",
        isFailed    && "border-destructive/40",
      )}
    >
      {/* Progress bar top edge */}
      {isRunning && (
        <div className="h-[2px] w-full rounded-t-lg bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="px-3.5 py-3 flex items-start gap-3">
        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {isRunning && (
            <IconLoader2
              className="size-[15px] text-muted-foreground animate-spin"
              strokeWidth={1.5}
            />
          )}
          {isCompleted && (
            <IconCheck className="size-[15px] text-[var(--signal-green)]" strokeWidth={2} />
          )}
          {isFailed && (
            <IconAlertTriangle className="size-[15px] text-destructive" strokeWidth={1.5} />
          )}
          {isCancelled && (
            <IconX className="size-[15px] text-muted-foreground" strokeWidth={1.5} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-medium truncate"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {activeRun.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {isRunning   && (activeRun.currentNode ?? "Running…")}
            {isCompleted && "Analysis complete — click to view"}
            {isFailed    && "Pipeline failed"}
            {isCancelled && "Cancelled"}
          </p>
          {isRunning && (
            <p
              className="text-[10px] text-muted-foreground/60 mt-1 tabular-nums"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {pct}% · {activeRun.runId.slice(0, 8)}
            </p>
          )}
        </div>

        {/* Dismiss only when not running */}
        {!isRunning && (
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconX className="size-[13px]" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}