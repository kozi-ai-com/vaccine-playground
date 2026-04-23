"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// ─── Session policy ────────────────────────────────────────────────────────────
// Inactivity timeout, resets on any user action (mouse, keyboard, etc.)
// This matches the UX expectation for a lab tool: researchers run a pipeline,
// go do wet-lab work for an hour, come back they should have to log in again.
const INACTIVITY_LIMIT_MS   = 60 * 60 * 1000; // 1 hour without activity
const WARN_BEFORE_EXPIRY_MS =  5 * 60 * 1000; // warn 5 min before
const ABSOLUTE_CAP_MS       =  8 * 60 * 60 * 1000; // 8h hard cap regardless of activity

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "click",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type SessionExpiredReason =
  | "inactivity"     // 1 hour no activity
  | "absolute_cap"   // 8 hour hard cap
  | "backend_401"    // server rejected the token
  | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionExpiredReason: SessionExpiredReason;
  /** Minutes left until inactivity logout. null = not logged in. */
  minutesRemaining: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  /** Authenticated fetch, injects Bearer token and handles 401 automatically. */
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [session, setSession]             = useState<Session | null>(null);
  const [loading, setLoading]             = useState(true);
  const [expiredReason, setExpiredReason] = useState<SessionExpiredReason>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  const inactivityTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const absoluteCapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef     = useRef<number>(Date.now());
  const loginTimeRef        = useRef<number | null>(null);
  const isLoggedInRef       = useRef(false);

  // ─── Clear all timers ───────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    ([inactivityTimerRef, warnTimerRef, absoluteCapTimerRef] as const).forEach(ref => {
      if (ref.current) { clearTimeout(ref.current); ref.current = null; }
    });
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  // ─── Force sign-out ─────────────────────────────────────────────────────────
  const expireSession = useCallback(async (reason: SessionExpiredReason) => {
    if (!isLoggedInRef.current) return;
    isLoggedInRef.current = false;
    clearTimers();
    setExpiredReason(reason);
    setMinutesRemaining(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    window.dispatchEvent(
      new CustomEvent("kozi:session-expired", { detail: { reason } })
    );
  }, [clearTimers]);

  // ─── Reset inactivity timer (called on every user action) ──────────────────
  const resetInactivityTimer = useCallback(() => {
    if (!isLoggedInRef.current) return;
    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warnTimerRef.current)       clearTimeout(warnTimerRef.current);
    if (countdownRef.current)       clearInterval(countdownRef.current);

    setMinutesRemaining(Math.ceil(INACTIVITY_LIMIT_MS / 60_000));

    // Warning fires 5 min before inactivity limit
    warnTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("kozi:session-warning", {
        detail: { minutesLeft: Math.ceil(WARN_BEFORE_EXPIRY_MS / 60_000) },
      }));
      let secsLeft = Math.floor(WARN_BEFORE_EXPIRY_MS / 1000);
      setMinutesRemaining(Math.ceil(secsLeft / 60));
      countdownRef.current = setInterval(() => {
        secsLeft -= 30;
        setMinutesRemaining(Math.max(0, Math.ceil(secsLeft / 60)));
      }, 30_000);
    }, INACTIVITY_LIMIT_MS - WARN_BEFORE_EXPIRY_MS);

    // Hard logout on inactivity
    inactivityTimerRef.current = setTimeout(() => {
      expireSession("inactivity");
    }, INACTIVITY_LIMIT_MS);
  }, [expireSession]);

  // ─── Arm session on login or rehydration ────────────────────────────────────
  const armSession = useCallback((iatSeconds: number) => {
    isLoggedInRef.current = true;
    loginTimeRef.current  = iatSeconds * 1000;

    const absoluteMsLeft = ABSOLUTE_CAP_MS - (Date.now() - loginTimeRef.current);
    if (absoluteMsLeft <= 0) { expireSession("absolute_cap"); return; }

    if (absoluteCapTimerRef.current) clearTimeout(absoluteCapTimerRef.current);
    absoluteCapTimerRef.current = setTimeout(
      () => expireSession("absolute_cap"),
      absoluteMsLeft
    );

    resetInactivityTimer();
  }, [expireSession, resetInactivityTimer]);

  // ─── Activity listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => resetInactivityTimer();
    ACTIVITY_EVENTS.forEach(ev =>
      window.addEventListener(ev, handler, { passive: true })
    );
    return () => ACTIVITY_EVENTS.forEach(ev =>
      window.removeEventListener(ev, handler)
    );
  }, [resetInactivityTimer]);

  // ─── Page visibility, detect browser reopen / returning to tab ─────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !isLoggedInRef.current) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= INACTIVITY_LIMIT_MS) {
        expireSession("inactivity");
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [expireSession]);

  // ─── Parse iat from JWT ──────────────────────────────────────────────────────
  const getIat = (token: string): number | null => {
    try { return JSON.parse(atob(token.split(".")[1])).iat ?? null; }
    catch { return null; }
  };

  // ─── Supabase bootstrap ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s?.access_token) {
        const iat = getIat(s.access_token);
        if (iat) {
          // If the persisted session is already stale (e.g. browser was closed
          // for > 1 hour), expire immediately instead of silently continuing.
          const staleness = Date.now() - iat * 1000;
          if (staleness >= INACTIVITY_LIMIT_MS) {
            expireSession("inactivity");
          } else {
            armSession(iat);
          }
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        setExpiredReason(null);
        if (s?.access_token) {
          const iat = getIat(s.access_token);
          if (iat) armSession(iat);
        }
      }
      if (event === "SIGNED_OUT") {
        isLoggedInRef.current = false;
        clearTimers();
        setUser(null);
        setSession(null);
        setMinutesRemaining(null);
        loginTimeRef.current = null;
      }
    });

    return () => { subscription.unsubscribe(); clearTimers(); };
  }, [armSession, clearTimers, expireSession]);

  // ─── signIn ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { data: betaUser } = await supabase
      .from("beta_users")
      .select("access_granted, name, organization, role")
      .eq("email", email)
      .single();

    if (!betaUser?.access_granted) throw new Error("ACCESS_DENIED");

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.session?.access_token) {
      const iat = getIat(data.session.access_token);
      if (iat) armSession(iat);
    }

    if (betaUser.name) {
      await supabase.auth.updateUser({
        data: {
          name: betaUser.name,
          organization: betaUser.organization,
          role: betaUser.role,
        },
      });
    }
    setExpiredReason(null);
  };

  // ─── signOut ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    isLoggedInRef.current = false;
    clearTimers();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMinutesRemaining(null);
    loginTimeRef.current = null;
    setExpiredReason(null);
  };

  // ─── updateDisplayName ───────────────────────────────────────────────────────
  const updateDisplayName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { name } });
    if (error) throw error;
    if (user?.email) {
      await supabase.from("beta_users").update({ name }).eq("email", user.email);
    }
    const { data } = await supabase.auth.getUser();
    if (data.user) setUser(data.user);
  };

  // ─── apiFetch
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { data: { session: current } } = await supabase.auth.getSession();
    const token = current?.access_token;

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) await expireSession("backend_401");
    return res;
  }, [expireSession]);

  return (
    <Ctx.Provider value={{
      user, session, loading,
      sessionExpiredReason: expiredReason,
      minutesRemaining,
      signIn, signOut, updateDisplayName, apiFetch,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be within AuthProvider");
  return c;
}