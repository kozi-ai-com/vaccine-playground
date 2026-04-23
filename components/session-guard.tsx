"use client";

/**
 * SessionGuard, place once inside DashboardLayout, after <SiteHeader />.
 *
 * Handles:
 *   1. Sonner toast warning (5 min before inactivity logout)
 *   2. Blocking modal when session expires (inactivity / absolute cap / 401)
 *
 * Reads events from auth-provider:
 *   "kozi:session-warning"  - show toast
 *   "kozi:session-expired"  - show modal
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Clock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

type ExpiredReason = "inactivity" | "absolute_cap" | "backend_401" | null;

const REASON_COPY: Record<NonNullable<ExpiredReason>, { title: string; body: string }> = {
  inactivity: {
    title: "Session timed out",
    body: "Your session ended after 1 hour of inactivity. Any pipeline runs you submitted are still processing, your results will be waiting when you log back in.",
  },
  absolute_cap: {
    title: "Session ended",
    body: "Your session reached the maximum duration. Please log in again to continue your research.",
  },
  backend_401: {
    title: "Session rejected",
    body: "Your session was rejected by the server. This can happen if you logged in from another device. Please log in again.",
  },
};

export function SessionGuard() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [expiredReason, setExpiredReason] = useState<ExpiredReason>(null);
  const [warningToastId, setWarningToastId] = useState<string | number | null>(null);

  // ── Warning toast ──────────────────────────────────────────────────────────
  const showWarningToast = useCallback((minutesLeft: number) => {
    const id = toast.warning(
      `Session expires in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}`,
      {
        description:
          "Save your work. Any active pipeline runs will complete, but you'll need to log in again.",
        duration: (minutesLeft * 60 * 1000) - 1000, // stays until expiry
        dismissible: true,
        icon: <Clock className="size-4" />,
      }
    );
    setWarningToastId(id);
  }, []);

  // ── Listen to auth-provider events ────────────────────────────────────────
  useEffect(() => {
    const onWarning = (e: Event) => {
      const { minutesLeft } = (e as CustomEvent).detail;
      if (warningToastId) toast.dismiss(warningToastId);
      showWarningToast(minutesLeft);
    };

    const onExpired = (e: Event) => {
      const { reason } = (e as CustomEvent).detail as { reason: ExpiredReason };
      if (warningToastId) toast.dismiss(warningToastId);
      toast.dismiss(); // dismiss all toasts
      setExpiredReason(reason);
    };

    window.addEventListener("kozi:session-warning", onWarning);
    window.addEventListener("kozi:session-expired", onExpired);
    return () => {
      window.removeEventListener("kozi:session-warning", onWarning);
      window.removeEventListener("kozi:session-expired", onExpired);
    };
  }, [showWarningToast, warningToastId]);

  // ── Re-login handler ──────────────────────────────────────────────────────
  const handleRelogin = async () => {
    await signOut();
    router.push("/login?reason=expired");
  };

  if (!expiredReason) return null;

  const copy = REASON_COPY[expiredReason];

  // ── Blocking modal, cannot be dismissed ─────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="relative mx-4 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">

        {/* Icon */}
        <div className="mb-4 flex items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            {expiredReason === "backend_401" ? (
              <ShieldAlert className="size-5 text-destructive" />
            ) : (
              <Lock className="size-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Copy */}
        <div className="mb-6 text-center">
          <h2
            id="session-expired-title"
            className="mb-2 text-base font-semibold text-foreground"
          >
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.body}
          </p>
        </div>

        {/* Pipeline safety note */}
        <div className="mb-5 rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Pipeline runs are safe.</span>{" "}
          Results are stored server-side and will be available in your history after you log back in.
        </div>

        {/* CTA */}
        <Button className="w-full" onClick={handleRelogin}>
          Log in again
        </Button>
      </div>
    </div>
  );
}