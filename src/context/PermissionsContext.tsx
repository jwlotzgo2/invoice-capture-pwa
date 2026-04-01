'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
    // Re-load when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  return (
    <PermissionsContext.Provider value={{ ...perms, refresh: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): Permissions {
  return useContext(PermissionsContext);
}
