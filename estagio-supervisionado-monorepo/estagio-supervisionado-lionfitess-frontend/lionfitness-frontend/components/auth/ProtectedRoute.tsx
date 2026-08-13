"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dashboardStyles } from "../layout/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteByRole } from "../../services/auth";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
  guestOnly?: boolean;
};

type ProtectedRouteStyles = {
  root: CSSProperties;
  card: CSSProperties;
  pageTitle: CSSProperties;
  pageDesc: CSSProperties;
};

function LoadingState() {
  const styles = dashboardStyles as unknown as ProtectedRouteStyles;

  return (
    <div
      style={{
        ...styles.root,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ ...styles.card, width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ ...styles.pageTitle, marginBottom: 8 }}>Lion Fitness</h1>
        <p style={{ ...styles.pageDesc, margin: 0 }}>Carregando acesso...</p>
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
