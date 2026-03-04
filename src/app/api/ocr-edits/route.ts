import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoice_id, edits } = body;

    if (!invoice_id || !edits || !Array.isArray(edits)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verify user owns the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Insert OCR edits
    const editRecords = edits.map((edit: {
      field_name: string;
      original_value: string | null;
      edited_value: string | null;
      edit_type?: 'correction' | 'addition' | 'deletion';
    }) => ({
      invoice_id,
      user_id: user.id,
      field_name: edit.field_name,
      original_value: edit.original_value,
      edited_value: edit.edited_value,
      edit_type: edit.edit_type || 'correction',
    }));

    const { data: insertedEdits, error: insertError } = await supabase
      .from('ocr_edits')
      .insert(editRecords)
      .select();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from('user_activity').insert({
      user_id: user.id,
      action: 'ocr_fields_corrected',
      entity_type: 'invoice',
      entity_id: invoice_id,
      metadata: {
        fields_corrected: edits.map((e: { field_name: string }) => e.field_name),
        edit_count: edits.length,
      },
    });

    return NextResponse.json({
      success: true,
      edits: insertedEdits,
    });
  } catch (error) {
    console.error('OCR edits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
