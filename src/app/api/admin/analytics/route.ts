import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // All edits in period
    const { data: edits } = await supabase
      .from('ocr_edits')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    // Total invoices in period
    const { count: totalInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate);

    const totalCorrections = edits?.length || 0;
    const overallAccuracy = totalInvoices
      ? Math.max(0, 100 - (totalCorrections / (totalInvoices * 7)) * 100)
      : 100;

    // Field accuracy
    const fieldMap: Record<string, number> = {};
    edits?.forEach((e) => {
      fieldMap[e.field_name] = (fieldMap[e.field_name] || 0) + 1;
    });

    const fields = ['supplier', 'description', 'invoice_date', 'amount', 'vat_amount', 'products_services', 'business_name'];
    const fieldAccuracy = fields.map((field) => {
      const corrections = fieldMap[field] || 0;
      const accuracy = totalInvoices ? Math.max(0, 100 - (corrections / totalInvoices) * 100) : 100;
      return { field_name: field, total_invoices: totalInvoices || 0, corrections, accuracy_percentage: Math.round(accuracy * 10) / 10 };
    });

    // Most corrected fields
    const mostCorrectedFields = Object.entries(fieldMap)
      .sort((a, b) => b[1] - a[1])
      .map(([field, corrections]) => ({ field, corrections }));

    // Daily trends
    const trendMap: Record<string, number> = {};
    edits?.forEach((e) => {
      const date = e.created_at.split('T')[0];
      trendMap[date] = (trendMap[date] || 0) + 1;
    });

    // Fill in all days in range
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const date = d.toISOString().split('T')[0];
      trends.push({ date, corrections: trendMap[date] || 0 });
    }

    // Recent edits
    const recentEdits = edits?.slice(0, 20) || [];

    return NextResponse.json({
      period: { days, startDate },
      overview: { totalInvoices: totalInvoices || 0, totalCorrections, overallAccuracy: Math.round(overallAccuracy * 10) / 10 },
      fieldAccuracy,
      mostCorrectedFields,
      trends,
      recentEdits,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
