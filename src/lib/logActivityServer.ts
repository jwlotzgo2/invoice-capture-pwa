// src/lib/logActivityServer.ts
// Server-side activity logger for API routes

import { createClient } from '@supabase/supabase-js';

export async function logActivityServer(
  userId: string,
  action: string,
  metadata?: Record<string, any>,
  entityType?: string,
  entityId?: string
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await supabase.from('user_activity').insert({
      user_id: userId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
    });
  } catch {
    // Never block
  }
}
