import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

export default function PreviewBanner() {
  const navigate = useNavigate();
  const { resetPreviewData } = useAuth();

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-4 py-3">
      <p className="text-sm text-[var(--text-primary)]">
        Preview mode — your portfolio stays in this browser. Sign up to save it
        to an account.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            resetPreviewData();
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          Reset sample data
        </button>
        <button
          type="button"
          onClick={() => navigate("/login", { state: { mode: "signin" } })}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          Sign in
        </button>
        <Button
          size="sm"
          onClick={() => navigate("/login", { state: { mode: "signup" } })}
        >
          Create account
        </Button>
      </div>
    </div>
  );
}
