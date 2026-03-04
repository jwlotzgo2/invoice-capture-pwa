import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OCRResult } from '@/types/invoice';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const DOCUMENT_TYPES = ['invoice', 'quote', 'purchase_order', 'credit_note', 'delivery_note', 'receipt'];

const CATEGORIES = [
  'Travel & Transport',
  'Utilities',
  'Materials & Supplies',
  'Subscriptions & Software',
  'Professional Services',
  'Food & Entertainment',
  'Equipment',
  'Marketing',
  'Other',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });

    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });

    const mediaType = `image/${base64Match[1]}` as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64Data = base64Match[2];

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Data },
              },
              {
                type: 'text',
                text: `Analyze this invoice image and extract all information. Return a JSON object with these exact fields:

- document_type: The type of document. Must be exactly one of: "invoice" (use for tax invoices and invoices), "quote", "purchase_order", "credit_note", "delivery_note", "receipt". Look at the document header/title to determine this.
- document_number: The invoice/quote/order/PO number shown on the document, as a string. Null if not found.
- supplier: Company or person who issued the invoice
- description: Brief description of what this invoice is for
- invoice_date: Date on the invoice in YYYY-MM-DD format
- amount: Total amount as a number (no currency symbols)
- vat_amount: VAT/tax amount as a number, or null if not specified
- products_services: Comma-separated list of products or services
- business_name: Name of the business receiving the invoice (customer), if visible
- confidence: Number between 0 and 1 indicating extraction confidence
- category: The most appropriate expense category from this exact list: ${CATEGORIES.map(c => `"${c}"`).join(', ')}. Choose based on the supplier name, description, and line items. Return exactly one of these strings.
- line_items: Array of line items found on the invoice. Each item should have:
  - description: string
  - quantity: number or null
  - unit_price: number or null  
  - line_total: number or null
  If no line items are visible, return an empty array [].

Return ONLY the JSON object, no additional text or markdown.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
    }

    const claudeResponse = await response.json();
    const textContent = claudeResponse.content.find((c: { type: string }) => c.type === 'text');
    if (!textContent) return NextResponse.json({ error: 'No text response from OCR' }, { status: 500 });

    let ocrData: OCRResult;
    try {
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      ocrData = JSON.parse(jsonText);

      // Validate document_type
      if (!ocrData.document_type || !DOCUMENT_TYPES.includes(ocrData.document_type)) {
        ocrData.document_type = 'invoice';
      }

      // Validate category is from our list
      if (ocrData.category && !CATEGORIES.includes(ocrData.category)) {
        ocrData.category = 'Other';
      }

      // Ensure line_items is always an array
      if (!Array.isArray(ocrData.line_items)) {
        ocrData.line_items = [];
      }
    } catch (parseError) {
      console.error('Failed to parse OCR response:', textContent.text);
      ocrData = {
        document_type: 'invoice', document_number: null,
        supplier: null, description: null, invoice_date: null,
        amount: null, vat_amount: null, products_services: null,
        business_name: null, confidence: 0, category: null,
        line_items: [], raw_response: textContent.text,
      };
    }

    ocrData.raw_response = textContent.text;
    return NextResponse.json(ocrData);
  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
