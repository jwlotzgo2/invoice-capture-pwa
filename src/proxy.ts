import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ['/invoices', '/capture', '/review', '/documents', '/projects', '/reports', '/settings', '/api/invoices', '/api/ocr', '/api/ocr-edits', '/api/push/subscribe', '/api/org'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  const adminPaths = ['/admin', '/api/admin'];
  const isAdminPath = adminPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && (isProtectedPath || isAdminPath)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user && (isAdminPath || isProtectedPath)) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, org_id, can_capture, can_view_reports, can_view_documents')
      .eq('id', user.id)
      .single();

    // Admin gate
    if (isAdminPath && profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Org permission gates — only apply when user is in an org
    if (profile?.org_id) {
      const path = request.nextUrl.pathname;

      // Bookkeepers cannot capture or review
      if (!profile.can_capture && (path.startsWith('/capture') || path.startsWith('/review'))) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('blocked', 'capture');
        return NextResponse.redirect(url);
      }

      // Users without report access cannot view reports
      if (!profile.can_view_reports && path.startsWith('/reports')) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('blocked', 'reports');
        return NextResponse.redirect(url);
      }

      // Users without document access cannot view documents
      if (!profile.can_view_documents && path.startsWith('/documents')) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('blocked', 'documents');
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && request.nextUrl.pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
