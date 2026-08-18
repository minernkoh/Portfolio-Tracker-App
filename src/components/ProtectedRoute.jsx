import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./ui/LoadingState";

export default function ProtectedRoute({ children }) {
  const { session, loading, isPreview, enterPreview } = useAuth();

  useEffect(() => {
    if (!loading && !session && !isPreview) {
      enterPreview();
    }
  }, [loading, session, isPreview, enterPreview]);

  if (loading) {
    return <LoadingState fullScreen />;
  }

  if (session || isPreview) {
    return children;
  }

  return <LoadingState fullScreen />;
}
