// this component provides the basic page layout (wrapper)
// it creates a consistent structure for all pages with a footer

import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PreviewBanner from "./PreviewBanner";

export default function Layout({ children }) {
  const { isPreview } = useAuth();
  const { pathname } = useLocation();
  const showBanner = isPreview && pathname !== "/login";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col">
      {/* main content area */}
      <main className="flex-1 w-full sm:w-[90%] md:w-[80vw] max-w-[1600px] mx-auto px-6 py-8">
        {showBanner && <PreviewBanner />}
        {children}
      </main>
      
      {/* footer at the bottom of the page */}
      <footer className="border-t border-[var(--border-subtle)] py-6 mt-8">
        <div className="w-full sm:w-[90%] md:w-[80vw] max-w-[1600px] mx-auto px-6 text-center text-xs text-[var(--text-secondary)]">
          &copy; Portfolio Tracker by Min Ern Koh
        </div>
      </footer>
    </div>
  );
}
