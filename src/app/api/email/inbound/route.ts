import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Postmark inbound webhook payload shape (relevant fields only)
interface PostmarkAttachment {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength: number;
  ContentID?: string; // set for inline images (e.g. cid:image001.png)
}

interface PostmarkInbound {
  From: string;
  FromFull: { Email: string; Name: string };
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  Attachments: PostmarkAttachment[];
  MessageID: string;
  Date: string;
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_PDF_TYPE = 'application/pdf';

export async function POST(request: NextRequest) {
  try {
    // ── 1. Verify secret token in URL query param ────────────────────
    // Set webhook URL in Postmark as:
    // https://invoice-capture-pwa.vercel.app/api/email/inbound?secret=YOUR_SECRET
    const webhookSecret = process.env.POSTMARK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const { searchParams } = new URL(request.url);
      const incoming = searchParams.get('secret');
      if (incoming !== webhookSecret) {
        console.warn('Postmark webhook secret mismatch — got:', incoming ? 'wrong value' : 'nothing');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // ── 2. Parse payload ──────────────────────────────────────────────
    const payload: PostmarkInbound = await request.json();
    const senderEmail = payload.FromFull?.Email || payload.From;

    if (!senderEmail) {
      return NextResponse.json({ error: 'No sender email' }, { status: 400 });
    }

    // ── 3. Service-role Supabase client (bypasses RLS) ────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 4. Look up user by email ──────────────────────────────────────
    const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr) throw userErr;

    const user = users.find(u => u.email?.toLowerCase() === senderEmail.toLowerCase());
    if (!user) {
      console.log(`Email from unregistered sender: ${senderEmail}`);
      // Silently accept — don't reveal registration status to sender
      return NextResponse.json({ message: 'OK' });
    }

    // ── 5. Find processable attachments ───────────────────────────────
    // Exclude inline images (Outlook signatures, logos etc. have a ContentID like cid:image001.png)
    const attachments = (payload.Attachments || []).filter(a => {
      const isSupported = SUPPORTED_IMAGE_TYPES.includes(a.ContentType) || a.ContentType === SUPPORTED_PDF_TYPE;
      const isInline = !!a.ContentID && a.ContentID.trim() !== '';
      const isTooSmall = a.ContentLength < 10000; // ignore anything under 10KB — likely a logo/icon
      if (isInline) { console.log(`Skipping inline attachment: ${a.Name} (ContentID: ${a.ContentID})`); return false; }
      if (isTooSmall) { console.log(`Skipping small attachment: ${a.Name} (${a.ContentLength} bytes)`); return false; }
      return isSupported;
    });

    // Log all attachments for diagnostics
    console.log(`Total attachments in payload: ${(payload.Attachments || []).length}`);
    (payload.Attachments || []).forEach((a, i) => {
      console.log(`  [${i}] ${a.Name} | type: ${a.ContentType} | size: ${a.ContentLength} | contentID: ${a.ContentID || 'none'} | hasContent: ${!!a.Content && a.Content.length > 0}`);
    });
    console.log(`Processable attachments after filter: ${attachments.length}`);

    if (attachments.length === 0) {
      console.log(`Email from ${senderEmail} had no supported attachments`);
      return NextResponse.json({ message: 'No supported attachments' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const results = [];

    // ── 6. Process each attachment ────────────────────────────────────
    for (const attachment of attachments) {
      try {
        const isImage = SUPPORTED_IMAGE_TYPES.includes(attachment.ContentType);
        const mediaType = attachment.ContentType as
          'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

        // ── 6a. Upload to Supabase Storage ────────────────────────────
        const fileExt = attachment.Name.split('.').pop() || (isImage ? 'jpg' : 'pdf');
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const fileBytes = Buffer.from(attachment.Content, 'base64');

        const { error: uploadErr } = await supabase.storage
          .from('invoices')
          .upload(fileName, fileBytes, { contentType: attachment.ContentType, upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);

        // ── 6b. OCR with Claude ───────────────────────────────────────
        let ocrData: any = {};

        if (anthropicKey) {
          const contentBlock = isImage
            ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: attachment.Content } }
            : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.Content } };

          const ocrResponse = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              ...(mediaType === 'application/pdf' ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              messages: [{
                role: 'user',
                content: [
                  contentBlock,
                  {
                    type: 'text',
                    text: `Extract invoice data. Return ONLY a JSON object with these fields:
- supplier: company/person who issued this
- description: brief description of what this invoice is for
- invoice_date: date in YYYY-MM-DD format
- amount: total amount as number (no currency symbols)
- vat_amount: VAT/tax amount as number, or null
- products_services: comma-separated list of products/services
- business_name: name of the receiving business if visible
- document_number: invoice/receipt number if visible
- confidence: 0-1 confidence score
If a field cannot be determined, set it to null. Return ONLY the JSON, no markdown.`,
                  },
                ],
              }],
            }),
          });

          if (ocrResponse.ok) {
            const claudeData = await ocrResponse.json();
            const text = claudeData.content?.find((c: any) => c.type === 'text')?.text || '';
            try {
              const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
              ocrData = JSON.parse(clean);
            } catch {
              console.error('Failed to parse OCR response for attachment:', attachment.Name);
            }
          }
        }

        // ── 6c. Create invoice record ─────────────────────────────────
        const { data: invoice, error: insertErr } = await supabase
          .from('invoices')
          .insert({
            user_id: user.id,
            supplier: ocrData.supplier || null,
            description: ocrData.description || (payload.Subject ? `Email: ${payload.Subject}` : null),
            invoice_date: ocrData.invoice_date || null,
            amount: ocrData.amount ? parseFloat(ocrData.amount) : null,
            vat_amount: ocrData.vat_amount ? parseFloat(ocrData.vat_amount) : null,
            products_services: ocrData.products_services || null,
            business_name: ocrData.business_name || null,
            document_number: ocrData.document_number || null,
            image_path: fileName,
            image_url: publicUrl,
            source: 'email',
            status: 'pending_review',
            email_from: senderEmail,
            email_subject: payload.Subject || null,
            email_message_id: payload.MessageID || null,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        results.push({ attachment: attachment.Name, invoice_id: invoice.id, status: 'created' });
        console.log(`Created invoice ${invoice.id} from email attachment: ${attachment.Name}`);

        // ── 6d. Fire push notification to org members ─────────────────
        try {
          const { data: profile } = await supabase
            .from('user_profiles').select('org_id').eq('id', user.id).single();
          if (profile?.org_id) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://invoice-capture-pwa.vercel.app';
            await fetch(`${baseUrl}/api/push/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
              },
              body: JSON.stringify({
                org_id: profile.org_id,
                title: 'New invoice received',
                body: ocrData.supplier
                  ? `From ${ocrData.supplier}${ocrData.amount ? ` · R${parseFloat(ocrData.amount).toFixed(2)}` : ''}`
                  : `From ${senderEmail}`,
                url: '/review',
              }),
            });
          }
        } catch (pushErr) {
          console.error('Push notification failed (non-fatal):', pushErr);
        }

      } catch (attachErr) {
        console.error(`Failed to process attachment ${attachment.Name}:`, attachErr);
        results.push({ attachment: attachment.Name, status: 'failed', error: String(attachErr) });
      }
    }

    return NextResponse.json({ message: 'Processed', results });

  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Postmark sends a HEAD request to verify the webhook URL
export async function GET() {
  return NextResponse.json({ ok: true });
}
