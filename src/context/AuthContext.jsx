import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { PREVIEW_USER_ID } from "../data/previewSeed";
import {
  isPreviewEnabled,
  setPreviewEnabled,
  resetTransactions as resetPreviewTransactions,
} from "../services/previewStore";

const AuthContext = createContext(null);

const PREVIEW_USER = { id: PREVIEW_USER_ID };

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
  const [isPreview, setIsPreview] = useState(() => isPreviewEnabled());

  const supabase = useMemo(() => getSupabase(), []);
  const queryClient = useQueryClient();

  // a real session always wins over preview
  useEffect(() => {
    if (session && isPreview) {
      setPreviewEnabled(false);
      setIsPreview(false);
    }
  }, [session, isPreview]);

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
      if (!error) {
        setPreviewEnabled(false);
        setIsPreview(false);
      }
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
    // drop all cached data so the next account never sees this user's data
    queryClient.clear();
  }, [supabase, queryClient]);

  const enterPreview = useCallback(() => {
    setPreviewEnabled(true);
    setIsPreview(true);
    queryClient.clear();
  }, [queryClient]);

  const exitPreview = useCallback(() => {
    setPreviewEnabled(false);
    setIsPreview(false);
    queryClient.clear();
  }, [queryClient]);

  const resetPreviewData = useCallback(() => {
    resetPreviewTransactions();
    queryClient.invalidateQueries({
      queryKey: ["transactions", PREVIEW_USER_ID],
    });
  }, [queryClient]);

  const previewActive = isPreview && !session;

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? (previewActive ? PREVIEW_USER : null),
      profile,
      isAdmin: !previewActive && profile?.role === "admin",
      isPreview: previewActive,
      loading,
      signIn,
      signUp,
      signOut,
      enterPreview,
      exitPreview,
      resetPreviewData,
      supabase,
      isConfigured: isSupabaseConfigured(),
    }),
    [
      session,
      previewActive,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      enterPreview,
      exitPreview,
      resetPreviewData,
      supabase,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// context modules conventionally export the provider and its hook together
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
