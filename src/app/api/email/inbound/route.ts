import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Lazy initialization of Supabase admin client
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !serviceKey) {
      throw new Error('Supabase configuration missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    
    supabaseAdmin = createClient(url, serviceKey);
  }
  return supabaseAdmin;
}

// Postmark Inbound Webhook Payload Interface
interface PostmarkInboundEmail {
  FromFull: { Email: string; Name: string };
  ToFull: { Email: string; Name: string }[];
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  MessageID: string;
  Date: string;
  Attachments: {
    Name: string;
    Content: string; // Base64 encoded
    ContentType: string;
    ContentLength: number;
  }[];
  Headers: { Name: string; Value: string }[];
}

// Supported image types for OCR
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf', // We'll handle PDF separately if needed
];

export async function POST(request: NextRequest) {
  console.log('[Email Webhook] Received inbound email');

  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = process.env.POSTMARK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get('X-Postmark-Webhook-Secret');
      if (providedSecret !== webhookSecret) {
        console.error('[Email Webhook] Invalid webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload: PostmarkInboundEmail = await request.json();
    console.log('[Email Webhook] From:', payload.FromFull.Email);
    console.log('[Email Webhook] Subject:', payload.Subject);
    console.log('[Email Webhook] Attachments:', payload.Attachments?.length || 0);

    // Find user by email (the sender must be a registered user)
    const { data: userProfile, error: userError } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id, email, is_active')
      .eq('email', payload.FromFull.Email.toLowerCase())
      .single();

    if (userError || !userProfile) {
      console.log('[Email Webhook] Unknown sender:', payload.FromFull.Email);
      // Create email record for unregistered user tracking
      await getSupabaseAdmin().from('email_invoices').insert({
        message_id: payload.MessageID,
        from_email: payload.FromFull.Email,
        from_name: payload.FromFull.Name,
        subject: payload.Subject,
        text_body: payload.TextBody,
        html_body: payload.HtmlBody,
        received_at: payload.Date,
        status: 'failed',
        error_message: 'Sender email not registered in system',
        attachment_count: payload.Attachments?.length || 0,
      });
      return NextResponse.json({ 
        success: false, 
        message: 'Sender not registered' 
      });
    }

    if (!userProfile.is_active) {
      console.log('[Email Webhook] Inactive user:', payload.FromFull.Email);
      return NextResponse.json({ 
        success: false, 
        message: 'User account is inactive' 
      });
    }

    // Filter for image attachments
    const imageAttachments = payload.Attachments?.filter(
      (att) => SUPPORTED_IMAGE_TYPES.includes(att.ContentType)
    ) || [];

    if (imageAttachments.length === 0) {
      console.log('[Email Webhook] No image attachments found');
      // Record email without images
      await getSupabaseAdmin().from('email_invoices').insert({
        user_id: userProfile.id,
        message_id: payload.MessageID,
        from_email: payload.FromFull.Email,
        from_name: payload.FromFull.Name,
        subject: payload.Subject,
        text_body: payload.TextBody,
        received_at: payload.Date,
        status: 'completed',
        error_message: 'No image attachments found',
        attachment_count: 0,
      });
      return NextResponse.json({ 
        success: true, 
        message: 'No images to process' 
      });
    }

    // Process each image attachment
    const processedInvoices = [];
    for (const attachment of imageAttachments) {
      try {
        console.log('[Email Webhook] Processing:', attachment.Name);

        // Create email invoice record
        const { data: emailRecord, error: emailError } = await getSupabaseAdmin()
          .from('email_invoices')
          .insert({
            user_id: userProfile.id,
            message_id: payload.MessageID,
            from_email: payload.FromFull.Email,
            from_name: payload.FromFull.Name,
            subject: payload.Subject,
            text_body: payload.TextBody,
            received_at: payload.Date,
            status: 'processing',
            attachment_count: 1,
          })
          .select()
          .single();

        if (emailError) {
          console.error('[Email Webhook] Error creating email record:', emailError);
          continue;
        }

        // Upload image to storage
        const fileName = `${userProfile.id}/${Date.now()}-${attachment.Name}`;
        const binaryData = Buffer.from(attachment.Content, 'base64');

        const { data: uploadData, error: uploadError } = await getSupabaseAdmin().storage
          .from('invoices')
          .upload(fileName, binaryData, {
            contentType: attachment.ContentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('[Email Webhook] Storage upload error:', uploadError);
          await getSupabaseAdmin()
            .from('email_invoices')
            .update({ status: 'failed', error_message: 'Failed to upload image' })
            .eq('id', emailRecord.id);
          continue;
        }

        // Get public URL
        const { data: urlData } = getSupabaseAdmin().storage
          .from('invoices')
          .getPublicUrl(uploadData.path);

        // Perform OCR
        const ocrResult = await performOCR(attachment.Content, attachment.ContentType);

        // Create invoice record
        const { data: invoice, error: invoiceError } = await getSupabaseAdmin()
          .from('invoices')
          .insert({
            user_id: userProfile.id,
            supplier: ocrResult.supplier,
            description: ocrResult.description || `Invoice from email: ${payload.Subject}`,
            invoice_date: ocrResult.invoice_date,
            amount: ocrResult.amount,
            vat_amount: ocrResult.vat_amount,
            products_services: ocrResult.products_services,
            business_name: ocrResult.business_name,
            image_url: urlData.publicUrl,
            image_path: uploadData.path,
            raw_ocr_data: ocrResult,
            original_ocr_values: {
              supplier: ocrResult.supplier,
              description: ocrResult.description,
              invoice_date: ocrResult.invoice_date,
              amount: ocrResult.amount,
              vat_amount: ocrResult.vat_amount,
              products_services: ocrResult.products_services,
              business_name: ocrResult.business_name,
            },
            status: 'pending',
            source: 'email',
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('[Email Webhook] Invoice creation error:', invoiceError);
          await getSupabaseAdmin()
            .from('email_invoices')
            .update({ status: 'failed', error_message: 'Failed to create invoice' })
            .eq('id', emailRecord.id);
          continue;
        }

        // Update email record with invoice reference
        await getSupabaseAdmin()
          .from('email_invoices')
          .update({
            invoice_id: invoice.id,
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', emailRecord.id);

        // Log activity
        await getSupabaseAdmin().from('user_activity').insert({
          user_id: userProfile.id,
          action: 'invoice_created_from_email',
          entity_type: 'invoice',
          entity_id: invoice.id,
          metadata: {
            email_id: emailRecord.id,
            subject: payload.Subject,
            attachment_name: attachment.Name,
          },
        });

        processedInvoices.push(invoice);
        console.log('[Email Webhook] Created invoice:', invoice.id);
      } catch (attachmentError) {
        console.error('[Email Webhook] Error processing attachment:', attachmentError);
      }
    }

    return NextResponse.json({
      success: true,
      invoicesCreated: processedInvoices.length,
      invoiceIds: processedInvoices.map((i) => i.id),
    });
  } catch (error) {
    console.error('[Email Webhook] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// OCR function using Claude
async function performOCR(base64Image: string, contentType: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('[OCR] No API key configured');
    return {
      supplier: null,
      description: null,
      invoice_date: null,
      amount: null,
      vat_amount: null,
      products_services: null,
      business_name: null,
      confidence: 0,
    };
  }

  try {
    const mediaType = contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this invoice image and extract the following information. Return a JSON object with these exact fields:

- supplier: The name of the company or person who issued this invoice
- description: A brief description of what this invoice is for
- invoice_date: The date on the invoice in YYYY-MM-DD format
- amount: The total amount as a number (without currency symbols)
- vat_amount: The VAT/tax amount as a number (without currency symbols), or null if not specified
- products_services: A comma-separated list of products or services on the invoice
- business_name: The name of the business receiving the invoice (the customer), if visible
- confidence: A number between 0 and 1 indicating how confident you are in the extraction

If any field cannot be determined, set it to null.

Return ONLY the JSON object, no additional text or markdown formatting.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[OCR] Claude API error:', response.status);
      throw new Error('OCR processing failed');
    }

    const claudeResponse = await response.json();
    const textContent = claudeResponse.content.find((c: { type: string }) => c.type === 'text');

    if (!textContent) {
      throw new Error('No text response from OCR');
    }

    // Parse the JSON response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('[OCR] Error:', error);
    return {
      supplier: null,
      description: null,
      invoice_date: null,
      amount: null,
      vat_amount: null,
      products_services: null,
      business_name: null,
      confidence: 0,
    };
  }
}

// GET endpoint for testing webhook connectivity
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Postmark inbound webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
