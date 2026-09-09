"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteByRole } from "../../services/auth";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
  guestOnly?: boolean;
};

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 text-center shadow-lg animate-rise">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Lion Fitness</h1>
        <p className="m-0 text-sm text-muted-foreground">Carregando acesso...</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  guestOnly = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isReady, role } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (guestOnly) {
      if (isAuthenticated) {
        router.replace(getDefaultRouteByRole(role));
      }

      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (allowedRoles?.length && !allowedRoles.includes(role || "")) {
      router.replace(getDefaultRouteByRole(role));
    }
  }, [allowedRoles, guestOnly, isAuthenticated, isReady, pathname, role, router]);

  if (!isReady) {
    return <LoadingState />;
  }

  if (guestOnly) {
    return isAuthenticated ? <LoadingState /> : <>{children}</>;
  }

  if (!isAuthenticated) {
    return <LoadingState />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role || "")) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
