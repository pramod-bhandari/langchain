import { createClient } from '@/utils/supabase/server'

export type User = {
  id: string
  email?: string
  name?: string
}

export type Session = {
  user: User
  expires: string
}

// Simplified auth function that gets the current session
export async function auth(): Promise<Session | null> {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return null
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name
    },
    expires: session.expires_at?.toString() || ''
  }
} 