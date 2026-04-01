import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Run all queries in parallel — use count/head where possible instead of fetching all rows
    const [
      usersRes,
      invoiceCountRes,
      invoicesWeekRes,
      emailRes,
      ocreditsRes,
      activityRes,
      orgsRes,
      statusRes,
      sourceRes,
      invoiceUsersRes,
      ocrActivityRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id, is_active, organisation_id, org_id'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('email_invoices').select('id', { count: 'exact', head: true }),
      supabase.from('ocr_edits').select('id', { count: 'exact', head: true }),
      supabase.from('user_activity').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('organisations').select('id, name'),
      // Get status/source breakdowns via selective queries instead of fetching all rows
      supabase.from('invoices').select('status'),
      supabase.from('invoices').select('source'),
      // For per-org invoice counts — only fetch user_id column
      supabase.from('invoices').select('user_id'),
      // OCR confidence from activity log metadata
      supabase.from('user_activity').select('metadata').eq('action', 'capture_ocr').not('metadata', 'is', null),
    ]);

    const users = usersRes.data || [];
    const orgs = orgsRes.data || [];

    // Status breakdown — aggregate in JS from lightweight query (only 'status' column)
    const invoicesByStatus = { pending: 0, pending_review: 0, reviewed: 0, approved: 0, rejected: 0 };
    (statusRes.data || []).forEach((i: { status: string }) => {
      if (i.status in invoicesByStatus) (invoicesByStatus as Record<string, number>)[i.status]++;
    });

    // Source breakdown
    const invoicesBySource = { camera: 0, upload: 0, email: 0 };
    (sourceRes.data || []).forEach((i: { source: string }) => {
      if (i.source in invoicesBySource) (invoicesBySource as Record<string, number>)[i.source]++;
    });

    // Per-org stats — user counts and invoice counts
    const invoiceUserList = invoiceUsersRes.data || [];
    const orgStats = orgs.map(org => {
      const orgUsers = users.filter(u => u.organisation_id === org.id || u.org_id === org.id);
      const orgUserIds = new Set(orgUsers.map(u => u.id));
      const orgInvoiceCount = invoiceUserList.filter(i => orgUserIds.has(i.user_id)).length;
      return {
        id: org.id,
        name: org.name,
        user_count: orgUsers.length,
        invoice_count: orgInvoiceCount,
        avg_confidence: null as number | null,
      };
    });

    // Overall OCR confidence from activity log
    const ocrEvents = ocrActivityRes.data || [];
    const confidences = ocrEvents
      .map((e: { metadata: any }) => e.metadata?.confidence)
      .filter((c: any) => typeof c === 'number' && c > 0);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
      : null;
    const lowConfidenceCount = confidences.filter((c: number) => c < 0.7).length;

    return NextResponse.json({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      totalInvoices: invoiceCountRes.count || 0,
      invoicesThisWeek: invoicesWeekRes.count || 0,
      totalEmailInvoices: emailRes.count || 0,
      totalOCREdits: ocreditsRes.count || 0,
      invoicesByStatus,
      invoicesBySource,
      recentActivity: activityRes.count || 0,
      avgConfidence,
      lowConfidenceCount,
      orgs: orgStats,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
