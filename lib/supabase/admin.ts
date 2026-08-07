import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client. It bypasses RLS entirely, so it exists for the two paths
// that have no cookie session to authorize with: the Bearer-token OCR API and
// the Paddle webhook. Never import this from anything that renders.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Thrown at call time rather than at module load. A module-load throw would
  // fail the whole build for anything that transitively imports this file,
  // which makes the app impossible to develop before the key is in place.
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add the Supabase secret key (sb_secret_...) to .env.local.',
    )
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      // There is no user to persist and no browser to refresh a token for; the
      // service role key is the credential on every request.
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
