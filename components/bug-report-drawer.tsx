"use client"

import * as React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription,
  DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase"

const MAX_LENGTH = 5000

type Status = "idle" | "sending" | "sent" | "error"

interface BugReportCtx {
  openBugReport: () => void
}

const Ctx = createContext<BugReportCtx | null>(null)

export function useBugReport() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useBugReport must be used within BugReportProvider")
  return c
}

export function BugReportProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen]     = useState(false)
  const [desc, setDesc]     = useState("")
  const [page, setPage]     = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError]   = useState<string | null>(null)
  const timers              = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const openBugReport = useCallback(() => {
    setPage(window.location.pathname)
    setError(null)
    setStatus("idle")
    /* Small delay: lets a closing dropdown menu release focus and scroll-lock
       before the drawer takes over. Without it the drawer can open "dead". */
    timers.current.push(setTimeout(() => setOpen(true), 60))
  }, [])

  const handleSubmit = async () => {
    const text = desc.trim()
    if (!text || status === "sending") return

    if (!user) {
      setError("You need to be signed in to send a report.")
      setStatus("error")
      return
    }

    setStatus("sending")
    setError(null)

    const { error: insertError } = await supabase.from("bug_reports").insert({
      user_id:     user.id,
      email:       user.email ?? null,
      page,
      description: text,
      user_agent:  navigator.userAgent,
    })

    if (insertError) {
      console.error("[bug-report] insert failed:", insertError)
      setError("Could not send your report. Please try again.")
      setStatus("error")
      return
    }

    setStatus("sent")
    timers.current.push(setTimeout(() => {
      setOpen(false)
      setDesc("")
      setStatus("idle")
    }, 1800))
  }

  const sending = status === "sending"

  return (
    <Ctx.Provider value={{ openBugReport }}>
      {children}

      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent
          className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[400px]"
        >
          <DrawerHeader className="shrink-0 border-b border-foreground/10 px-5 py-4">
            <DrawerTitle className="text-base font-medium">Report a bug</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Describe what happened. We&apos;ll investigate and follow up.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label className="label-upper">Page</Label>
              <p className="data-mono select-all rounded-md border border-foreground/10 bg-muted px-2.5 py-1.5">
                {page || "-"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bug-desc" className="label-upper">Description</Label>
              <Textarea
                id="bug-desc"
                rows={8}
                maxLength={MAX_LENGTH}
                placeholder="Steps to reproduce…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={sending || status === "sent"}
                className="min-h-40 resize-none text-base"
              />
              <p className="data-mono text-right text-xs text-tertiary">
                {desc.length}/{MAX_LENGTH}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="label-upper">Browser</Label>
              <p className="break-all text-xs leading-relaxed text-tertiary">
                {typeof navigator !== "undefined" ? navigator.userAgent : "-"}
              </p>
            </div>
          </div>

          <DrawerFooter className="shrink-0 gap-3 border-t border-foreground/10 px-5 py-4">
            {status === "error" && error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            {status === "sent" ? (
              <p role="status" className="text-sm font-medium text-signal-green">
                Sent, thank you.
              </p>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!desc.trim() || sending}
                  className="h-9 flex-1 text-sm"
                >
                  {sending ? "Sending…" : "Send report"}
                </Button>
                <DrawerClose
                  className="h-9 rounded-md border border-border bg-transparent px-4 text-sm transition-colors hover:bg-accent"
                >
                  Cancel
                </DrawerClose>
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Ctx.Provider>
  )
}