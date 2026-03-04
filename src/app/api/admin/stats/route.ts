import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Run all queries in parallel
    const [
      usersRes,
      invoicesRes,
      emailRes,
      ocreditsRes,
      activityRes,
      orgsRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id, is_active, organisation_id, organisation_name'),
      supabase.from('invoices').select('id, status, source, created_at, invoice_date, raw_ocr_data, user_id'),
      supabase.from('email_invoices').select('id', { count: 'exact', head: true }),
      supabase.from('ocr_edits').select('id', { count: 'exact', head: true }),
      supabase.from('user_activity').select('id').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('organisations').select('id, name'),
    ]);

    const users = usersRes.data || [];
    const invoices = invoicesRes.data || [];
    const orgs = orgsRes.data || [];

    // Week filter
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const invoicesThisWeek = invoices.filter(i => i.created_at >= weekAgo).length;

    // Status breakdown
    const invoicesByStatus = { pending: 0, reviewed: 0, approved: 0, rejected: 0 };
    invoices.forEach(i => { if (i.status in invoicesByStatus) (invoicesByStatus as any)[i.status]++; });

    // Source breakdown
    const invoicesBySource = { camera: 0, upload: 0, email: 0 };
    invoices.forEach(i => { if (i.source in invoicesBySource) (invoicesBySource as any)[i.source]++; });

    // OCR confidence
    const confidenceScores = invoices
      .map(i => (i.raw_ocr_data as any)?.confidence as number)
      .filter(c => typeof c === 'number' && !isNaN(c));
    const avgConfidence = confidenceScores.length
      ? confidenceScores.reduce((s, c) => s + c, 0) / confidenceScores.length
      : null;
    const lowConfidenceCount = confidenceScores.filter(c => c < 0.7).length;

    // Per-org stats
    const orgStats = orgs.map(org => {
      const orgUsers = users.filter(u => u.organisation_id === org.id);
      const orgUserIds = new Set(orgUsers.map(u => u.id));
      const orgInvoices = invoices.filter(i => orgUserIds.has(i.user_id));
      const orgConf = orgInvoices
        .map(i => (i.raw_ocr_data as any)?.confidence as number)
        .filter(c => typeof c === 'number' && !isNaN(c));
      return {
        id: org.id,
        name: org.name,
        user_count: orgUsers.length,
        invoice_count: orgInvoices.length,
        avg_confidence: orgConf.length ? orgConf.reduce((s, c) => s + c, 0) / orgConf.length : null,
      };
    });

    return NextResponse.json({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      totalInvoices: invoices.length,
      invoicesThisWeek,
      totalEmailInvoices: emailRes.count || 0,
      totalOCREdits: ocreditsRes.count || 0,
      invoicesByStatus,
      invoicesBySource,
      recentActivity: activityRes.data?.length || 0,
      avgConfidence,
      lowConfidenceCount,
      orgs: orgStats,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
