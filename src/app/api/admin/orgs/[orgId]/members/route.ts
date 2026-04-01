import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Params = { params: Promise<{ orgId: string }> };

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: 'Unauthorized' };
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { user: null, error: 'Forbidden' };
  return { user, error: null };
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST /api/admin/orgs/[orgId]/members — assign a user to this org
export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user: admin, error: authErr } = await checkAdmin();
  if (authErr || !admin) return NextResponse.json({ error: authErr ?? 'Forbidden' }, { status: authErr === 'Unauthorized' ? 401 : 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const svc = serviceClient();

  // Upsert org_members row (reactivate if previously removed)
  const { error: memberErr } = await svc
    .from('org_members')
    .upsert(
      {
        org_id: orgId,
        user_id: userId,
        is_owner: false,
        preset: 'member',
        can_capture: true,
        can_view_all_org_invoices: true,
        can_view_reports: true,
        can_view_documents: true,
        is_active: true,
      },
      { onConflict: 'user_id,org_id', ignoreDuplicates: false }
    );

  if (memberErr) return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });

  // Keep user_profiles.org_id in sync
  const { error: profileErr } = await svc
    .from('user_profiles')
    .update({ org_id: orgId })
    .eq('id', userId);

  if (profileErr) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/orgs/[orgId]/members — remove a user from this org
export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user: admin, error: authErr } = await checkAdmin();
  if (authErr || !admin) return NextResponse.json({ error: authErr ?? 'Forbidden' }, { status: authErr === 'Unauthorized' ? 401 : 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const svc = serviceClient();

  // Soft-delete: deactivate the org_members row
  const { error: memberErr } = await svc
    .from('org_members')
    .update({ is_active: false, is_owner: false })
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (memberErr) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  // Clear user_profiles.org_id
  const { error: profileErr } = await svc
    .from('user_profiles')
    .update({ org_id: null })
    .eq('id', userId);

  if (profileErr) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });

  return NextResponse.json({ success: true });
}
