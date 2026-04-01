import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/org/[orgId]/members — full member roster for this org
export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  const { data, error: dbErr } = await supabase
    .from('org_members')
    .select(`
      id, org_id, user_id, is_owner, preset,
      can_capture, can_view_all_org_invoices,
      can_view_reports, can_view_documents,
      is_active, joined_at, updated_at,
      user_profiles ( full_name, email )
    `)
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('joined_at');

  if (dbErr) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  // Flatten user_profiles join into each member row
  const members = (data || []).map(({ user_profiles, ...rest }: any) => ({
    ...rest,
    full_name: user_profiles?.full_name ?? null,
    email: user_profiles?.email ?? null,
  }));

  return NextResponse.json({ members });
}
