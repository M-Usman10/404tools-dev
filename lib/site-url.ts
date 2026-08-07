const LOCAL_SITE_URL = "http://localhost:3000"

function ensureProtocol(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  return `https://${url}`
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    LOCAL_SITE_URL

  return ensureProtocol(configuredUrl).replace(/\/+$/, "")
}

export function getAuthCallbackUrl(next?: string) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl())

  if (next) {
    callbackUrl.searchParams.set("next", next)
  }

  return callbackUrl.toString()
}

// The post-login destination arrives in a query string an attacker can write,
// and login() hands it straight to redirect(). "starts with a slash" is not
// enough: "//evil.com" and "/\evil.com" are protocol-relative URLs that a
// browser resolves against the current origin and follows off-site, which turns
// the genuine login page into the first half of a credential phish. Resolving
// the value and insisting the origin still matches ours settles every spelling
// of that trick at once.
export function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard"
  }

  const siteUrl = getSiteUrl()

  let resolved: URL
  try {
    resolved = new URL(next, siteUrl)
  } catch {
    return "/dashboard"
  }

  if (resolved.origin !== new URL(siteUrl).origin) {
    return "/dashboard"
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
