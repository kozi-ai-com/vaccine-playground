"use client";

/**
 * Dashboard layout
 * Uses shadcn sidebar-07 pattern:
 * SidebarProvider  AppSidebar + SidebarInset
 * SidebarInset handles the responsive offset automatically
 * no custom collapsed state, no Framer width animation needed.
 * The sidebar primitive handles all of that internally.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SessionGuard } from "@/components/session-guard";
import { RunMonitor } from "@/components/run-monitor";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    /*
      SidebarProvider manages collapse state internally.
      SidebarInset is the main content area, it automatically
      offsets from the sidebar and fills remaining width.
      No custom width tracking, no dead space.
    */
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* SiteHeader sits inside SidebarInset so it scrolls with the sidebar trigger */}
        <SiteHeader />
        <SessionGuard />
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
        {/* Persistent run monitor, survives all page navigation */}
        <RunMonitor />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}