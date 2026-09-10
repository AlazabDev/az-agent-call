import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AuthMe, MailAdminRole, MailRoleSource } from "@shared/api";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: MailAdminRole | null;
  roleSource: MailRoleSource | null;
  canOperate: boolean;
  canRotateTokens: boolean;
  refreshAccess: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readServerAccess(session: Session | null): Promise<AuthMe | null> {
  if (!session) return null;
  const response = await fetch("/api/auth/me", { headers: { authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) return null;
  return response.json() as Promise<AuthMe>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<MailAdminRole | null>(null);
  const [roleSource, setRoleSource] = useState<MailRoleSource | null>(null);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setLoading(true);
    try {
      const access = await readServerAccess(nextSession);
      setRole(access?.role ?? null);
      setRoleSource(access?.user.roleSource ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) void applySession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) queueMicrotask(() => void applySession(nextSession));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    isAdmin: role !== null,
    role,
    roleSource,
    canOperate: role === "owner" || role === "admin" || role === "operator",
    canRotateTokens: role === "owner" || role === "admin",
    refreshAccess: async () => { const { data } = await supabase.auth.getSession(); await applySession(data.session); },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: error?.message ?? null };
    },
    signOut: async () => { await supabase.auth.signOut(); setRole(null); setRoleSource(null); },
  }), [session, loading, role, roleSource, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
