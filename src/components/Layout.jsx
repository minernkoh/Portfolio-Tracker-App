// this component provides the basic page layout (wrapper)
// it creates a consistent structure for all pages with a footer

import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col">
      {/* main content area */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-8">
        {children}
      </main>
      
      {/* footer at the bottom of the page */}
      <footer className="border-t border-[var(--border-subtle)] py-6 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 flex justify-between items-center text-xs text-[var(--text-secondary)]">
            <span>&copy; Portfolio Tracker by Min Ern Koh</span>
            <Link to="/about" className="hover:text-white transition-colors">About app</Link>
        </div>
      </footer>
    </div>
  );
}
