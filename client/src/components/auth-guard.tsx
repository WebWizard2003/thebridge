import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user, loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token, user, loadUser]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading || (!user && token)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
