'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { OrgRole } from '@/types/invoice';

export interface Permissions {
  // Loading state
  loading: boolean;
  // Org context
  orgId: string | null;
  orgRole: OrgRole | null;
  isOrgOwner: boolean;
  inOrg: boolean;
  // Feature flags
  canCapture: boolean;
  canViewAllInvoices: boolean;
  canViewReports: boolean;
  canViewDocuments: boolean;
  // Helpers
  isBookkeeper: boolean;
  isCapturer: boolean;
  isMember: boolean;
  // Refresh (call after joining or leaving org)
  refresh: () => Promise<void>;
}

const defaultPermissions: Permissions = {
  loading: true,
  orgId: null,
  orgRole: null,
  isOrgOwner: false,
  inOrg: false,
  canCapture: true,
  canViewAllInvoices: false,
  canViewReports: true,
  canViewDocuments: true,
  isBookkeeper: false,
  isCapturer: false,
  isMember: false,
  refresh: async () => {},
};

const PermissionsContext = createContext<Permissions>(defaultPermissions);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [perms, setPerms] = useState<Permissions>(defaultPermissions);
  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user || error) {
      setPerms({ ...defaultPermissions, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('org_id, org_role, is_org_owner, can_capture, can_view_all_invoices, can_view_reports, can_view_documents')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setPerms({ ...defaultPermissions, loading: false });
      return;
    }

    const inOrg = !!profile.org_id;
    const orgRole = (profile.org_role as OrgRole | null) ?? null;

    setPerms(prev => ({
      ...prev,
      loading: false,
      orgId: profile.org_id ?? null,
      orgRole,
      isOrgOwner: profile.is_org_owner ?? false,
      inOrg,
      // Solo users (no org) always get full access
      canCapture:          inOrg ? (profile.can_capture ?? true)           : true,
      canViewAllInvoices:  inOrg ? (profile.can_view_all_invoices ?? false) : false,
      canViewReports:      inOrg ? (profile.can_view_reports ?? true)       : true,
      canViewDocuments:    inOrg ? (profile.can_view_documents ?? true)     : true,
      isBookkeeper: orgRole === 'bookkeeper',
      isCapturer:   orgRole === 'capturer',
      isMember:     orgRole === 'member',
      refresh: load,
    }));
  }, [supabase]);

  useEffect(() => {
    load();

    // Listen for auth events: refresh permissions on token refresh, redirect on sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        setPerms({ ...defaultPermissions, loading: false });
        router.push('/auth/login');
      } else {
        load();
      }
    });

    // When the PWA comes back to the foreground, proactively refresh the session.
    // Without this, an expired token won't be refreshed until the next getUser() call,
    // which silently returns null and leaves the app blank.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getUser().then((res: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
          const user = res.data?.user;
          if (!user) {
            router.push('/auth/login');
          } else {
            load();
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // When the device reconnects after being offline, reload auth + permissions.
    // Without this, pages that failed to fetch while offline stay blank until manual refresh.
    const handleOnline = () => { load(); };
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [load, router, supabase]);

  return (
    <PermissionsContext.Provider value={{ ...perms, refresh: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): Permissions {
  return useContext(PermissionsContext);
}
