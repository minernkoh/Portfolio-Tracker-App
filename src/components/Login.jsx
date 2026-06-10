import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Layout from "./Layout";
import Button from "./ui/Button";
import FormInput from "./ui/FormInput";

export default function Login() {
  const { session, loading, signIn, signUp, isConfigured } = useAuth();
  const location = useLocation();
  // restore the full location (path + query + hash) the user was redirected from
  const fromLocation = location.state?.from;
  const from = fromLocation
    ? `${fromLocation.pathname || "/"}${fromLocation.search || ""}${fromLocation.hash || ""}`
    : "/";

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-[var(--text-secondary)]">
          Loading…
        </div>
      </Layout>
    );
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter email and password");
      return;
    }
    setPending(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          toast.error(error.message || "Sign in failed");
        } else {
          toast.success("Signed in");
        }
      } else {
        const { error } = await signUp(email.trim(), password);
        if (error) {
          toast.error(error.message || "Sign up failed");
        } else {
          toast.success("Check your email to confirm your account, then sign in.");
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-lg">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
            Portfolio Tracker
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Sign in with your account. Admins use the same login; access is
            determined by your profile in Supabase.
          </p>

          {!isConfigured && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              Missing <code className="text-xs">VITE_SUPABASE_URL</code> or{" "}
              <code className="text-xs">VITE_SUPABASE_ANON_KEY</code>. Add them
              in Vercel project settings (or <code className="text-xs">.env</code> locally).
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                mode === "signin"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                mode === "signup"
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={pending || !isConfigured}
            />
            <FormInput
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              disabled={pending || !isConfigured}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={pending || !isConfigured}
            >
              {pending
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-[var(--text-secondary)] text-center">
            Session is stored in your browser (localStorage). Use the public anon
            key only — never expose the service role key in the frontend.
          </p>
        </div>
        <Link
          to="/"
          className="mt-6 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Back to app
        </Link>
      </div>
    </Layout>
  );
}
