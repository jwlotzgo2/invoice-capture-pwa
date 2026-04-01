import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/org/[orgId]/regenerate-code — generate a new org join code
export async function POST(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { supabase, error } = await checkOrgOwner(orgId);
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });

  const { data: newCode, error: rpcErr } = await supabase.rpc('generate_org_code');
  if (rpcErr || !newCode) return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });

  const { error: dbErr } = await supabase
    .from('organisations')
    .update({ org_code: newCode })
    .eq('id', orgId);

  if (dbErr) return NextResponse.json({ error: 'Failed to save new code' }, { status: 500 });
  return NextResponse.json({ success: true, org_code: newCode });
}
