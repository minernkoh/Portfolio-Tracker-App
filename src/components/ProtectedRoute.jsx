import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./ui/LoadingState";

export default function ProtectedRoute({ children }) {
  const { session, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return <LoadingState fullScreen />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
