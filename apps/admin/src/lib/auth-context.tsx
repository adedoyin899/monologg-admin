"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminClient, type AdminMeResponse, type AdminRole } from "./admin-client";

interface AuthContextValue {
  data: AdminMeResponse | null;
  isLoading: boolean;
  error: string | null;
  signInWithToken: (token: string) => Promise<void>;
  signInAsRole: (role: AdminRole, aal?: "aal1" | "aal2") => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    let token = adminClient.getToken();
    if (!token) {
      if (typeof window !== "undefined") {
        token = "mock-admin:superadmin@monologg.com:aal2";
        adminClient.setToken(token);
      } else {
        setData(null);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      const meData = await adminClient.getMe();
      setData(meData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const signInWithToken = async (token: string) => {
    adminClient.setToken(token);
    await fetchMe();
  };

  const signInAsRole = async (role: AdminRole, aal: "aal1" | "aal2" = "aal2") => {
    const token = `mock-admin:${role.toLowerCase()}@monologg.com:${aal}`;
    adminClient.setToken(token);
    await fetchMe();
  };

  const signOut = () => {
    adminClient.clearToken();
    setData(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        data,
        isLoading,
        error,
        signInWithToken,
        signInAsRole,
        signOut,
        refresh: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

