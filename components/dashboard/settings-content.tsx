"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/lib/user-context"
import { updatePassword, updateProfile } from "@/lib/actions/auth"
import { STRONG_PASSWORD_MESSAGE } from "@/lib/password-validation"

// Fixed locale and an explicit UTC zone, because this string is rendered once on
// the server and again on the client and the two have to agree exactly.
const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

export function SettingsContent() {
  const { user, profile } = useUser()
  const router = useRouter()

  const [name, setName] = useState(profile?.full_name ?? "")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const email = profile?.email ?? user?.email ?? ""
  const createdAt = profile?.created_at ?? user?.created_at ?? null
  const trimmedName = name.trim()
  // Nothing to save when the field is empty or still holds what the server
  // already has, and a disabled button says so before the click does.
  const profileUnchanged = trimmedName.length === 0 || trimmedName === (profile?.full_name ?? "")

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingProfile(true)

    const formData = new FormData()
    formData.set("name", trimmedName)
    const result = await updateProfile(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Profile updated")
      // The name is server-rendered into the header and the layout's profile,
      // so the new value only reaches them through a refresh.
      router.refresh()
    }

    setSavingProfile(false)
  }

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingPassword(true)

    const form = event.currentTarget
    const result = await updatePassword(new FormData(form))

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Password updated", {
        description: "Your other sessions stay signed in.",
      })
      form.reset()
    }

    setSavingPassword(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>The name we use across the dashboard and on your receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                maxLength={120}
              />
            </div>
            <Button type="submit" disabled={savingProfile || profileUnchanged}>
              {savingProfile ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing this does not touch your API keys — revoke those on the API keys page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Enter a new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">{STRONG_PASSWORD_MESSAGE}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat the new password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Spinner />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            The email address is the account identity and cannot be changed here. Write in and we
            will move it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 truncate font-mono text-sm text-foreground">{email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Member since
              </dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {createdAt ? memberSince(createdAt) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
