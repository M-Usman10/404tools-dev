import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Paths whose session must be kept alive by the middleware. Everything else
// passes straight through — the public tools and the landing page never read
// the session, so we don't spend a getUser() round-trip on them.
function needsSession(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname === "/signup"
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!needsSession(pathname)) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — this is critical for keeping the session alive
  const { data: { user } } = await supabase.auth.getUser()

  // NextResponse.redirect() builds a brand new response, so any cookie the
  // refresh above rotated onto `response` is silently thrown away. Supabase
  // issues single-use refresh tokens: lose the rotated pair on one redirect and
  // the browser keeps presenting the spent one, which logs the user out at a
  // seemingly random later navigation. Every redirect out of this middleware
  // has to carry those cookies forward.
  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ""
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
    const redirect = NextResponse.redirect(url, 302)
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }

  // Protect dashboard routes. The original path rides along as ?next= so the
  // login form can return the user to the page they actually asked for.
  if (pathname.startsWith("/dashboard") && !user) {
    return redirectTo("/login", { next: pathname })
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirectTo("/dashboard")
  }

  return response
}

export const config = {
  matcher: [
    // Excludes API routes (the Paddle webhook and the Bearer-token /api/v1/ocr
    // endpoint carry no cookie session and must never be redirected), Next
    // internals, and files with an extension.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
