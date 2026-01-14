// Authentication helper for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function verifyAuth(req: Request, supabase: any) {
  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No valid authorization header'
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    return {
      success: false,
      error: 'Authentication verification failed'
    }
  }
}
