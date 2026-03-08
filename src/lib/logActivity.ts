// src/lib/logActivity.ts
// Client-side activity logger — fire and forget, never throws

import { createClient } from '@/lib/supabase/client';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'capture_ocr'
  | 'capture_offline'
  | 'sync_upload'
  | 'email_received'
  | 'document_viewed'
  | 'document_edited'
  | 'document_deleted'
  | 'export_csv'
  | 'push_subscribed'
  | 'review_approved'
  | 'page_view';

export async function logActivity(
  action: ActivityAction,
  metadata?: Record<string, any>,
  entityType?: string,
  entityId?: string
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from('user_activity').insert({
      user_id: session.user.id,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Silently fail — never block the user
  }
}
