// error boundary to catch and display errors in the component tree

import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  // react calls this automatically when a child component throws an error
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // react calls this automatically to log error details
  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-red-500 p-8 font-mono">
          <h1 className="text-2xl font-bold mb-4">⚠️ Error Loading App</h1>
          <p className="mb-4">
            Something went wrong. Check the browser console for details.
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer mb-2">Error Details</summary>
            <pre className="bg-[#121214] p-4 rounded-lg overflow-auto text-sm">
              {this.state.error?.toString()}
              {this.state.error?.stack}
            </pre>
          </details>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
