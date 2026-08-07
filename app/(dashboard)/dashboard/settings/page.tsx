import type { Metadata } from "next"

import { SettingsContent } from "@/components/dashboard/settings-content"

export const metadata: Metadata = {
  title: "Settings",
  description: "Your name, your password, and the details of your account.",
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your name, your password, and the details of your account.
        </p>
      </div>

      <SettingsContent />
    </div>
  )
}
