import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';

type Params = { params: Promise<{ orgId: string }> };

// PATCH /api/org/[orgId]/settings — rename org
export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { supabase, error } = await checkOrgOwner(orgId);
  if (error) return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  }

  const { error: dbErr } = await supabase
    .from('organisations')
    .update({ name: name.trim() })
    .eq('id', orgId);

  if (dbErr) return NextResponse.json({ error: 'Failed to update org name' }, { status: 500 });
  return NextResponse.json({ success: true });
}
