// this component provides the basic page layout (wrapper)
// it creates a consistent structure for all pages with a footer

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col">
      {/* main content area */}
      <main className="flex-1 w-[80%] max-w-[1800px] mx-auto py-8">
        {children}
      </main>
      
      {/* footer at the bottom of the page */}
      <footer className="border-t border-[var(--border-subtle)] py-6 mt-8">
        <div className="w-[80%] max-w-[1800px] mx-auto text-center text-xs text-[var(--text-secondary)]">
          &copy; Portfolio Tracker by Min Ern Koh
        </div>
      </footer>
    </div>
  );
}
