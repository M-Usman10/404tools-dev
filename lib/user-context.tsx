"use client"

import { createContext, useContext } from "react"
import type { User } from "@supabase/supabase-js"
import { signOut as signOutAction } from "@/lib/actions/auth"

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  /** Prepaid OCR pages still available to spend. Debited by the Bearer-token
   *  OCR route, topped up by the Paddle webhook when a pack is paid for. */
  pages_balance: number
  pages_used_total: number
  paddle_customer_id?: string | null
  created_at?: string | null
  /** Whether this account has ever bought a pack. Computed in the dashboard
   *  layout rather than stored on the row, because it is what decides the
   *  paywall — a balance of zero is a customer who ran out, which is a very
   *  different thing from a customer who never bought. */
  has_purchased?: boolean
}

interface UserContextType {
  user: User | null
  profile: Profile | null
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  signOut: async () => {},
})

export function UserProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode
  initialUser?: User | null
  initialProfile?: Profile | null
}) {
  const handleSignOut = async () => {
    await signOutAction()
  }

  return (
    <UserContext.Provider value={{ user: initialUser, profile: initialProfile, signOut: handleSignOut }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
