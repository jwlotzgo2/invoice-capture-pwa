import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Get invoice counts per user
    const { data: invoiceCounts } = await supabase
      .from('invoices')
      .select('user_id');

    const countMap: Record<string, number> = {};
    invoiceCounts?.forEach((inv) => {
      countMap[inv.user_id] = (countMap[inv.user_id] || 0) + 1;
    });

    // Get last activity per user
    const { data: activities } = await supabase
      .from('user_activity')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });

    const activityMap: Record<string, string> = {};
    activities?.forEach((act) => {
      if (!activityMap[act.user_id]) activityMap[act.user_id] = act.created_at;
    });

    const enriched = users?.map((u) => ({
      ...u,
      invoice_count: countMap[u.id] || 0,
      last_activity: activityMap[u.id] || u.last_login_at || null,
    }));

    return NextResponse.json({ users: enriched || [], total: enriched?.length || 0 });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await checkAdmin(supabase);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId, updates } = await request.json();
    if (!userId || !updates) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    // Only allow safe fields
    const allowed = ['role', 'is_active', 'full_name'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
