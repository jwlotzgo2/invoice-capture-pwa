import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/org/[orgId]/transfer-ownership — transfer ownership to another member
export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  const { newOwnerMemberId } = await req.json();
  if (!newOwnerMemberId) return NextResponse.json({ error: 'newOwnerMemberId required' }, { status: 400 });

  // Verify the new owner is an active member of this org and not already the owner
  const { data: newOwner } = await supabase
    .from('org_members')
    .select('id, user_id, is_owner')
    .eq('id', newOwnerMemberId)
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single();

  if (!newOwner) return NextResponse.json({ error: 'Member not found in this org' }, { status: 404 });
  if (newOwner.is_owner) return NextResponse.json({ error: 'Already an owner' }, { status: 400 });

  // Use service role client for the transactional update
  // (RLS on org_members prevents owner from setting is_owner=true on others)
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Revoke current owner
  const { error: err1 } = await serviceSupabase
    .from('org_members')
    .update({ is_owner: false })
    .eq('org_id', orgId)
    .eq('user_id', user.id);

  // Grant new owner
  const { error: err2 } = await serviceSupabase
    .from('org_members')
    .update({ is_owner: true })
    .eq('id', newOwnerMemberId);

  if (err1 || err2) return NextResponse.json({ error: 'Transfer failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
