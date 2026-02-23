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
const API = "https://api.dailaunch.online"; // hardcoded, jangan pakai env var

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session dari localStorage ────────────────────────────────────
  const restoreSession = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
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

  // ── Handle ?session=xxx dari CLI (dailaunch login) ────────────────────────
  const handleUrlSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session");
    if (!sessionToken) return;

    window.history.replaceState({}, "", window.location.pathname);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/session?token=${sessionToken}`);
      if (!res.ok) return;
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
      console.error("[Auth] Session error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Handle ?auth=JWT dari GitHub OAuth web callback ───────────────────────
  // Backend /auth/github/callback redirect ke: DASHBOARD_URL?auth=JWT_TOKEN
  // JWT berisi: { githubToken, login, avatar, name }
  const handleUrlAuth = useCallback(async () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const jwtToken = params.get("auth");
    if (!jwtToken) return;

    // Bersihkan token dari URL
    window.history.replaceState({}, "", window.location.pathname);
    setLoading(true);
    try {
      // Verifikasi JWT ke backend untuk dapat user info
      const res = await fetch(`${API}/auth/me?token=${jwtToken}`);
      if (!res.ok) {
        console.error("[Auth] JWT invalid");
        setLoading(false);
        return;
      }
      const data = await res.json();

      // JWT expire 7 hari dari sekarang
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const authUser: AuthUser = {
        githubLogin:  data.login,
        githubName:   data.name  || data.login,
        githubAvatar: data.avatar || "",
        githubToken:  data.githubToken,
        expiresAt:    expiresAt.toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
    } catch (err) {
      console.error("[Auth] JWT auth error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Cek ?session= dulu (dari CLI), lalu ?auth= (dari OAuth web), lalu localStorage
      const params = new URLSearchParams(window.location.search);
      if (params.get("session")) {
        await handleUrlSession();
      } else if (params.get("auth")) {
        await handleUrlAuth();
      } else {
        await restoreSession();
      }
    };
    init();
  }, [handleUrlSession, handleUrlAuth, restoreSession]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, loading, logout };
}
