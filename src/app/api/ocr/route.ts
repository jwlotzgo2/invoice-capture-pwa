import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OCRResult } from '@/types/invoice';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
    }

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const mediaType = `image/${base64Match[1]}` as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64Data = base64Match[2];

    // Call Claude API for OCR
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
                  data: base64Data,
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
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
    }

    const claudeResponse = await response.json();
    const textContent = claudeResponse.content.find((c: { type: string }) => c.type === 'text');
    
    if (!textContent) {
      return NextResponse.json({ error: 'No text response from OCR' }, { status: 500 });
    }

    // Parse the JSON response
    let ocrData: OCRResult;
    try {
      // Clean up the response - remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      ocrData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse OCR response:', textContent.text);
      // Return empty result with low confidence
      ocrData = {
        supplier: null,
        description: null,
        invoice_date: null,
        amount: null,
        vat_amount: null,
        products_services: null,
        business_name: null,
        confidence: 0,
        raw_response: textContent.text,
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
