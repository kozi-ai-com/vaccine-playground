"use client"

import {
  ChevronsUpDown, LogOut, User, SunMoon, Sun, Moon, Monitor, Sparkles, Bug, Heart,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth-provider"
import { useBugReport } from "@/components/bug-report-drawer"

/* Set to the page path (e.g. "/sponsor") once that page exists.
   While null, "Sponsor us" is shown but does nothing, like "What's new". */
const SPONSOR_HREF: string | null = null

function DiceBearAvatar({ email, name, size = 32 }: { email: string; name: string; size?: number }) {
  const seed = encodeURIComponent(email || name || "researcher")
  const src  = `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=transparent`
  return (
    <div className="shrink-0 overflow-hidden rounded-md bg-muted" style={{ width: size, height: size, minWidth: size }}>
      <img src={src} alt={name} width={size} height={size} className="block size-full object-cover" loading="lazy" />
    </div>
  )
}

const THEMES = [
  { value: "light",  label: "Light",  icon: Sun     },
  { value: "dark",   label: "Dark",   icon: Moon    },
  { value: "system", label: "System", icon: Monitor },
] as const

export function NavUser({ user }: { user: { name: string; title?: string; email: string } }) {
  const { isMobile }          = useSidebar()
  const { signOut }           = useAuth()
  const { theme, setTheme }   = useTheme()
  const router                = useRouter()
  const { openBugReport }     = useBugReport()

  /* Same flow as Settings page: sign out, then go to /login. */
  const handleLogout = async () => {
    try {
      await signOut()
      router.replace("/login")
    } catch (e) {
      console.error("Failed to log out:", e)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {/* The whole card is the trigger: avatar, name, title and arrows all open the menu. */}
          <DropdownMenuTrigger
            className="peer/menu-button group/menu-button flex h-12 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0"
          >
            <DiceBearAvatar email={user.email} name={user.name} size={32} />
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-tertiary">
                {user.title || "Vaccine Researcher"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" strokeWidth={1.5} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-60 rounded-lg p-2"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            {/* GroupLabel must be inside a Group (Base UI). */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="grid gap-0.5 px-2 py-2.5 leading-tight">
                <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="mx-2 my-2 bg-foreground/10" />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer gap-2 px-2 py-1.5">
                <User className="size-4" strokeWidth={1.5} />
                Profile
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2 px-2 py-1.5">
                  <SunMoon className="size-4" strokeWidth={1.5} />
                  Appearance
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-40 rounded-lg p-2" sideOffset={8}>
                  <DropdownMenuRadioGroup
                    value={theme ?? "system"}
                    onValueChange={(v) => setTheme(String(v))}
                  >
                    {THEMES.map(({ value, label, icon: Icon }) => (
                      <DropdownMenuRadioItem key={value} value={value} closeOnClick className="cursor-pointer gap-2 py-1.5 pl-2">
                        <Icon className="size-4" strokeWidth={1.5} />
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="mx-2 my-2 bg-foreground/10" />

            <DropdownMenuGroup>
              {/* Inert on purpose: no handler, and the menu stays open if clicked. */}
              <DropdownMenuItem
                closeOnClick={false}
                className="cursor-default gap-2 px-2 py-1.5 focus:bg-transparent"
              >
                <Sparkles className="size-4" strokeWidth={1.5} />
                What&apos;s new
              </DropdownMenuItem>

              <DropdownMenuItem onClick={openBugReport} className="cursor-pointer gap-2 px-2 py-1.5">
                <Bug className="size-4" strokeWidth={1.5} />
                Report bug
              </DropdownMenuItem>

              <DropdownMenuItem
                closeOnClick={SPONSOR_HREF !== null}
                onClick={SPONSOR_HREF ? () => router.push(SPONSOR_HREF) : undefined}
                className={SPONSOR_HREF
                  ? "cursor-pointer gap-2 px-2 py-1.5"
                  : "cursor-default gap-2 px-2 py-1.5 focus:bg-transparent"}
              >
                <Heart className="size-4" strokeWidth={1.5} />
                Sponsor us
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="mx-2 my-2 bg-foreground/10" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                className="cursor-pointer gap-2 px-2 py-1.5"
              >
                <LogOut className="size-4" strokeWidth={1.5} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}