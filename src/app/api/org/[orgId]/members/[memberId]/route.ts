import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string; memberId: string }> };

const ALLOWED_FIELDS = ['preset', 'can_capture', 'can_view_all_org_invoices', 'can_view_reports', 'can_view_documents'] as const;

// PATCH /api/org/[orgId]/members/[memberId] — update preset or individual permissions
export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, memberId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  const body = await req.json();

  // Whitelist what can be updated
  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error: dbErr } = await supabase
    .from('org_members')
    .update(updates)
    .eq('id', memberId)
    .eq('org_id', orgId)
    .neq('user_id', user.id); // owners cannot update their own row via this endpoint

  if (dbErr) return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/org/[orgId]/members/[memberId] — remove member from org (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, memberId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  // Prevent owner from removing themselves
  const { data: target } = await supabase
    .from('org_members')
    .select('user_id, is_owner')
    .eq('id', memberId)
    .eq('org_id', orgId)
    .single();

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.user_id === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  if (target.is_owner) return NextResponse.json({ error: 'Cannot remove another owner' }, { status: 400 });

  const { error: dbErr } = await supabase
    .from('org_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('org_id', orgId);

  if (dbErr) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  return NextResponse.json({ success: true });
}
