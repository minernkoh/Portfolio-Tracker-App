import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("profile fetch error:", error);
    return { role: "user", email: null };
  }
  if (!data) return { role: "user", email: null };
  return { role: data.role === "admin" ? "admin" : "user", email: data.email };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabase(), []);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      if (s?.user) {
        fetchProfile(supabase, s.user.id).then((p) => {
          if (!cancelled) setProfile(p);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(supabase, s.user.id).then((p) => setProfile(p));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email, password) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email, password) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === "admin",
      loading,
      signIn,
      signUp,
      signOut,
      supabase,
      isConfigured: isSupabaseConfigured(),
    }),
    [session, profile, loading, signIn, signUp, signOut, supabase]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
