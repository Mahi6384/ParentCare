import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses Row Level Security (RLS)
// ONLY use in server-side code (API routes, Railway server)
// NEVER import this in a Client Component — it exposes the service key
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
