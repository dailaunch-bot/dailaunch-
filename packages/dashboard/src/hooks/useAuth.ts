"use client";

import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  githubLogin:  string;
  githubName:   string;
  githubAvatar: string;
  githubToken:  string;
  expiresAt:    string;
}

const STORAGE_KEY = "dailaunch_session";
const API = "https://api.dailaunch.online";

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage ────────────────────────────────────
  const restoreSession = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        // Check not expired
        if (new Date(parsed.expiresAt) > new Date()) {
          setUser(parsed);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  // ── Handle ?session=xxx in URL (from dailaunch login) ────────────────────
  const handleUrlSession = useCallback(async () => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session");
    if (!sessionToken) return;

    // Remove token from URL immediately (security)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/session?token=${sessionToken}`);
      if (!res.ok) {
        const err = await res.json();
        console.error("[Auth] Session invalid:", err.error);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const authUser: AuthUser = {
        githubLogin:  data.githubLogin,
        githubName:   data.githubName,
        githubAvatar: data.githubAvatar,
        githubToken:  data.githubToken,
        expiresAt:    data.expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
    } catch (err) {
      console.error("[Auth] Session fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await handleUrlSession();
      await restoreSession();
    };
    init();
  }, [handleUrlSession, restoreSession]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, loading, logout };
}
