"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, KeyRound, BarChart3, CreditCard, BookOpen, Settings, Plus } from "lucide-react"
import { useUser } from "@/lib/user-context"
import { BuyPagesDialog } from "@/components/dashboard/buy-pages-dialog"

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "API Keys",
    href: "/dashboard/api-keys",
    icon: KeyRound,
  },
  {
    title: "Usage",
    href: "/dashboard/usage",
    icon: BarChart3,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    title: "Docs",
    href: "/dashboard/docs",
    icon: BookOpen,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { profile } = useUser()
  const [buyOpen, setBuyOpen] = useState(false)

  const pagesBalance = profile?.pages_balance ?? 0

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-mono text-lg leading-none text-primary">[ ]</span>
            <span className="font-display text-lg font-bold text-foreground">404tools.dev</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
                      }
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* The balance sits directly above the button that refills it, so
                  the number and the fix for the number are never more than a
                  glance apart. */}
              <div className="flex items-baseline justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="text-xs text-muted-foreground">Pages left</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {pagesBalance.toLocaleString()}
                </span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => setBuyOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Buy pages</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Outside the Sidebar rather than in its footer: on mobile the sidebar
          body is a portalled Sheet, and nesting a second modal inside it means
          the dialog unmounts the moment the drawer closes. */}
      <BuyPagesDialog open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  )
}
