import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/push/subscribe — save a push subscription
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys, userAgent } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
    user_agent: userAgent || null,
  }, { onConflict: 'user_id,endpoint' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — remove subscription
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await request.json();
  await supabase.from('push_subscriptions')
    .delete().eq('user_id', user.id).eq('endpoint', endpoint);

  return NextResponse.json({ ok: true });
}
