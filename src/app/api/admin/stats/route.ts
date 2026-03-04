import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Active users (logged in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo);

    // Total invoices
    const { count: totalInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    // Invoices this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: invoicesThisWeek } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Email invoices
    const { count: totalEmailInvoices } = await supabase
      .from('email_invoices')
      .select('*', { count: 'exact', head: true });

    // OCR edits
    const { count: totalOCREdits } = await supabase
      .from('ocr_edits')
      .select('*', { count: 'exact', head: true });

    // Invoices by status
    const { data: invoices } = await supabase
      .from('invoices')
      .select('status, source');

    const invoicesByStatus = { pending: 0, reviewed: 0, approved: 0, rejected: 0 };
    const invoicesBySource = { camera: 0, upload: 0, email: 0 };

    invoices?.forEach((inv) => {
      if (inv.status in invoicesByStatus) invoicesByStatus[inv.status as keyof typeof invoicesByStatus]++;
      if (inv.source in invoicesBySource) invoicesBySource[inv.source as keyof typeof invoicesBySource]++;
    });

    // Recent activity (last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentActivity } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayAgo);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalInvoices: totalInvoices || 0,
      invoicesThisWeek: invoicesThisWeek || 0,
      totalEmailInvoices: totalEmailInvoices || 0,
      totalOCREdits: totalOCREdits || 0,
      invoicesByStatus,
      invoicesBySource,
      recentActivity: recentActivity || 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
