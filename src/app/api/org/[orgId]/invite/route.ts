import { NextRequest, NextResponse } from 'next/server';
import { checkOrgOwner } from '@/lib/supabase/org-auth';
import { Resend } from 'resend';

type Params = { params: Promise<{ orgId: string }> };

// POST /api/org/[orgId]/invite — send an email invite to join this org
export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const { user, supabase, error } = await checkOrgOwner(orgId);
  if (error || !user) return NextResponse.json({ error: error ?? 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });

  const { email } = await req.json();
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  // Fetch org name + inviter name
  const [{ data: org }, { data: inviter }] = await Promise.all([
    supabase.from('organisations').select('name, org_code').eq('id', orgId).single(),
    supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
  ]);

  if (!org?.org_code) return NextResponse.json({ error: 'Org has no invite code' }, { status: 400 });

  const appUrl = new URL(req.url).origin;
  const inviteUrl = `${appUrl}/auth/login?invite=${encodeURIComponent(org.org_code)}&email=${encodeURIComponent(email)}`;
  const inviterName = inviter?.full_name || 'Your team';
  const orgName = org.name;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:10px;height:10px;background:#38bdf8;border-radius:3px;"></td>
              <td style="padding-left:8px;font-size:17px;font-weight:800;color:#f0f0f0;letter-spacing:-0.3px;">Go Capture</td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">

          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6b6b6b;text-transform:uppercase;letter-spacing:0.5px;">You're invited</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#f0f0f0;letter-spacing:-0.5px;">Join ${orgName} on Go Capture</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#a3a3a3;line-height:1.6;">
            ${inviterName} has invited you to join <strong style="color:#f0f0f0;">${orgName}</strong> on Go Capture — a tool for capturing and managing invoices.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background:#f0f0f0;color:#0f0f0f;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
                Accept Invitation →
              </a>
            </td></tr>
          </table>

          <!-- Code fallback -->
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:8px;">
            <tr><td style="padding:16px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b6b6b;text-transform:uppercase;letter-spacing:0.5px;">Or use this code at sign-up</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#38bdf8;letter-spacing:4px;font-family:monospace;">${org.org_code}</p>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
            © 2026 Go Capture · Go 2 Analytics (Pty) Ltd<br>
            If you weren't expecting this invitation, you can safely ignore it.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error: sendErr } = await resend.emails.send({
    from: 'Go Capture <noreply@go2analytics.co.za>',
    to: email,
    subject: `${inviterName} invited you to join ${orgName} on Go Capture`,
    html,
  });

  if (sendErr) {
    console.error('Resend error:', sendErr);
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
