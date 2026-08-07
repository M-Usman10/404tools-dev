import { Suspense } from "react"
import { ConfirmClient } from "./confirm-client"

// Last leg of an email confirmation whose session arrived in the URL fragment
// rather than the query string. See app/auth/callback/route.ts for how a request
// gets here and why the server cannot finish the job itself.
export const metadata = { title: "Confirming", robots: { index: false } }

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmClient />
    </Suspense>
  )
}
