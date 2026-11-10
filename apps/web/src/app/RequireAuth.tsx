import { Navigate } from "react-router";
import { apiClient } from "../lib/api-client";

/**
 * Gates a route behind `apiClient.isAuthenticated()` (features.md Phase 4). In `mock` mode
 * (the default) this always passes — the prototype's ungated demo browsing is unchanged.
 * In `live` mode, an unauthenticated visitor is redirected to `/auth`.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!apiClient.isAuthenticated()) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}
