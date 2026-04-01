import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/org/[orgId]/members — full member roster for this org
export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  // Fetch org_members rows
  const { data: memberRows, error: dbErr } = await supabase
    .from('org_members')
    .select('id, org_id, user_id, is_owner, preset, can_capture, can_view_all_org_invoices, can_view_reports, can_view_documents, is_active, joined_at, updated_at')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('joined_at');

  if (dbErr) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  // Fetch user_profiles separately (org_members.user_id → auth.users, not user_profiles directly)
  const userIds = (memberRows || []).map((m: any) => m.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('user_profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
  const members = (memberRows || []).map((m: any) => ({
    ...m,
    full_name: profileMap[m.user_id]?.full_name ?? null,
    email: profileMap[m.user_id]?.email ?? null,
  }));

  return NextResponse.json({ members });
}
