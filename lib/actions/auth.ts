"use server"

import { createClient, getCachedUser } from "@/lib/supabase/server"
import { getAuthCallbackUrl, getSafeNextPath } from "@/lib/site-url"
import { getPasswordValidationError } from "@/lib/password-validation"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const turnstileToken = (formData.get("cf-turnstile-response") as string | null) ?? ""
  // The middleware bounces unauthenticated dashboard visitors to
  // /login?next=<path>, and the form forwards that along so we can put the user
  // back on the page they originally asked for instead of the dashboard root.
  const next = getSafeNextPath((formData.get("next") as string | null) ?? null)
  const headersList = await headers()
  const ip = getClientIp(headersList)

  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return { error: "Bot check failed. Please try again." }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect(next)
}

// Turnstile scores a token more accurately when it can see the visitor's IP,
// but the only place to read one is a proxy header, so a null here simply means
// we submit the token on its own.
function getClientIp(headersList: Headers): string | null {
  const candidates = [
    headersList.get("cf-connecting-ip"),
    headersList.get("x-forwarded-for")?.split(",")[0] ?? null,
    headersList.get("x-real-ip"),
  ]

  for (const raw of candidates) {
    const ip = raw?.trim()
    if (ip) return ip
  }

  return null
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // skip in environments without the key configured

  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.append("remoteip", ip)

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  })
  const data = await res.json()
  return data.success === true
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const fullName = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string
  const turnstileToken = (formData.get("cf-turnstile-response") as string | null) ?? ""
  const headersList = await headers()
  const ip = getClientIp(headersList)

  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return { error: "Bot check failed. Please try again." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  const passwordError = getPasswordValidationError(password)

  if (passwordError) {
    return { error: passwordError }
  }

  // The profiles row is created by the on_auth_user_created trigger in
  // scripts/001_profiles.sql, which reads full_name straight out of the user
  // metadata written here. Nothing to insert from this side.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: getAuthCallbackUrl(),
    },
  })

  if (error) {
    return { error: error.message }
  }

  // When the email already exists, Supabase silently returns a user with an
  // empty identities array instead of an error (to prevent email enumeration).
  // We detect this and return a proper error message.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Please log in instead." }
  }

  return { success: true }
}

export async function resendConfirmationEmail(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthCallbackUrl() },
  })

  if (error) {
    console.error("[resendConfirmationEmail] Supabase error:", error.status, error.message)
    return { error: error.message }
  }

  return { success: true }
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthCallbackUrl()}?type=recovery`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/")
}

export async function getUser() {
  return getCachedUser()
}

export async function getProfile() {
  const supabase = await createClient()
  const user = await getCachedUser()

  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return data
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const fullName = formData.get("name") as string

  // Both copies of the name have to move together: the profiles row is what the
  // dashboard reads, and the auth metadata is what the signup trigger seeds a
  // profile from, so leaving one behind makes them disagree forever.
  const [profileResult, authResult] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id),
    supabase.auth.updateUser({ data: { full_name: fullName } }),
  ])

  if (profileResult.error) return { error: profileResult.error.message }
  if (authResult.error) return { error: authResult.error.message }

  revalidatePath("/dashboard", "layout")
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  const passwordError = getPasswordValidationError(newPassword)

  if (passwordError) {
    return { error: passwordError }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }

  return { success: true }
}
