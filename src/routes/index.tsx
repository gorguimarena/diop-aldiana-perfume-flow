import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
