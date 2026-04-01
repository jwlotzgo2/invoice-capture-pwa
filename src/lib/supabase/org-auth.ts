// Org ownership check for /api/org/* route handlers
import { createClient } from '@/lib/supabase/server';

export async function checkOrgOwner(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, supabase, error: 'Unauthorized' };

  const { data } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .eq('is_owner', true)
    .eq('is_active', true)
    .single();

  if (!data) return { user: null, supabase, error: 'Forbidden' };
  return { user, supabase, error: null };
}
