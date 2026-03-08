import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Service role client — bypasses RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Called internally by email webhook after invoice created
// POST /api/push/send  { org_id, title, body, url }
export async function POST(request: NextRequest) {
  // Verify internal secret so this can't be called externally
  const secret = request.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { org_id, title, body, url } = await request.json();
  if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

  const supabase = getServiceClient();

  // Get all user_ids in this org
  const { data: members } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('org_id', org_id);

  if (!members?.length) return NextResponse.json({ ok: true, sent: 0 });

  const memberIds = members.map(m => m.id);

  // Get all push subscriptions for those users
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', memberIds);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({
    title: title || 'New invoice',
    body: body || 'A new invoice arrived via email',
    url: url || '/review',
    tag: 'go-capture-invoice',
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload
      ).catch(async err => {
        // 410 Gone = subscription expired, clean it up
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return NextResponse.json({ ok: true, sent, total: subs.length });
}
