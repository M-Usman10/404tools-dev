import type { Metadata } from "next"
import { CheckoutClient } from "./checkout-client"

export const metadata: Metadata = {
  title: "Checkout | 404tools",
  robots: { index: false, follow: false },
}

// No session read here: the customer (and so the prefilled email) is attached
// to the transaction server-side when checkout is created.
export default function CheckoutPage() {
  return <CheckoutClient />
}
