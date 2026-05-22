"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem("nexus_token");
    const raw = localStorage.getItem("nexus_user");
    if (token && raw) {
      try {
        setState({ user: JSON.parse(raw), token, loading: false });
      } catch {
        setState({ user: null, token: null, loading: false });
      }
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { token, user: raw } = data.data as { token: string; user: Record<string, unknown> };
    const user = { ...raw, full_name: raw.full_name ?? raw.name } as User;
    localStorage.setItem("nexus_token", token);
    localStorage.setItem("nexus_user", JSON.stringify(user));
    setState({ user, token, loading: false });
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("nexus_user");
    setState({ user: null, token: null, loading: false });
    window.location.href = "/login";
  }, []);

  return { ...state, login, logout };
}
